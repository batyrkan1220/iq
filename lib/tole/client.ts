// Typed adapter for the Tole Payments API (https://api.tolepay.kz/v1).
// Contract: OpenAPI 3.1 at https://api.tolepay.kz/v1/openapi.json — only documented routes/fields are used.
// Server-side only (Render Node server). Depends only on fetch + Web Crypto; no SDK.

import { type Logger, silentLogger } from "./log.ts";

export const TOLE_BASE_URL = "https://api.tolepay.kz/v1";
export type ToleEnvironment = "live" | "sandbox";

// ---- Schemas mirrored from the OpenAPI document -------------------------------------------

/** CreateQrRequest — additionalProperties: false; latitude & longitude must be present together. */
export interface CreateQrRequest {
  amount: number; // integer, 1..100000000 (KZT)
  latitude?: number; // -90..90
  longitude?: number; // -180..180
}

/** CreateInvoiceRequest — additionalProperties: false. */
export interface CreateInvoiceRequest {
  phoneNumber: string; // ^\+?7[0-9]{10}$
  amount: number; // integer, 1..100000000
  comment?: string; // maxLength 200
}

/** SuccessResponse — `data` is untyped in OpenAPI; see QrOperationData for the documented example fields. */
export interface SuccessResponse<T = Record<string, unknown>> {
  ok: true;
  data: T;
  commandId?: string;
  replayed?: boolean;
}

/** Fields shown in the Tole guide's POST /qr example. All optional because OpenAPI leaves `data` untyped. */
export interface QrOperationData {
  id?: string; // Tole local resource id (used as operationId / paymentIntentId)
  kind?: string;
  status?: string;
  amount?: number;
  paymentUrl?: string; // sensitive: never log
  qrToken?: string; // sensitive: never log
  expiresAt?: string | null;
  receiptUrl?: string | null;
  [k: string]: unknown;
}

export interface CommandPendingResponse { ok: false; kind: "in_progress"; commandId: string; replayed: true }
export interface CommandOutcomeUnknownResponse { ok: false; kind: "outcome_unknown"; commandId: string; replayed: boolean }
export interface ErrorResponse { statusCode: number; code: string; message: string }

export type PaymentIntentStatus = "pending" | "paid" | "cancelled" | "expired" | "failed" | "partially_refunded" | "refunded";
export interface PaymentIntent {
  id: string;
  kind: "invoice" | "qr";
  status: PaymentIntentStatus;
  amount: number;
  currency: "KZT";
  revision: number;
  createdAt: string;
  updatedAt: string;
  source: "scheduled_invoice" | null;
  recurringInvoiceId: string | null;
  occurrenceId: string | null;
  attemptNumber: number | null;
  receiptUrl?: string | null;
  receiptStatus?: "available" | "unavailable" | "not_paid";
  refundedAmount?: number;
  paidAt?: string | null;
  terminalAt?: string | null;
  lastReconciledAt?: string | null;
  environment?: ToleEnvironment;
}

/** GET /commands/{commandId} data, per the Tole guide (status enum not fully documented). */
export interface CommandState {
  commandId: string;
  status: string;
  responseStatus?: number;
  result?: { ok?: boolean; data?: Record<string, unknown>; commandId?: string } | null;
  updatedAt?: string;
}

// ---- Outcomes & errors --------------------------------------------------------------------

export type MutationOutcome<T> =
  | { state: "completed"; httpStatus: number; data: T; commandId: string | null; replayed: boolean }
  | { state: "in_progress"; commandId: string; retryAfterMs: number | null; location: string | null }
  | { state: "outcome_unknown"; commandId: string | null; reason: "provider" | "timeout" | "network" };

export type ToleErrorKind =
  | "validation" | "unauthorized" | "forbidden" | "not_found" | "conflict"
  | "rate_limited" | "server" | "timeout" | "network" | "config" | "bad_response";

export class ToleError extends Error {
  kind: ToleErrorKind;
  status: number | null;
  code: string | null;
  retryAfterMs: number | null;
  constructor(kind: ToleErrorKind, message: string, opts: { status?: number | null; code?: string | null; retryAfterMs?: number | null } = {}) {
    super(message);
    this.name = "ToleError";
    this.kind = kind;
    this.status = opts.status ?? null;
    this.code = opts.code ?? null;
    this.retryAfterMs = opts.retryAfterMs ?? null;
  }
}

// ---- Config ----------------------------------------------------------------------------------

export interface ToleClientOptions {
  apiKey: string;
  environment: ToleEnvironment;
  connectionId?: string | null;
  baseUrl?: string;
  timeoutMs?: number; // per request, default 10s
  readRetries?: number; // safe-read retries, default 3
  backoffBaseMs?: number; // default 400ms
  maxRetryAfterMs?: number; // cap for honoring Retry-After, default 30s
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  logger?: Logger;
}

const IDEMPOTENCY_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse Retry-After (delta-seconds or HTTP-date) into ms. */
export function parseRetryAfter(v: string | null, nowMs = Date.now()): number | null {
  if (!v) return null;
  const s = v.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 1000);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : Math.max(0, t - nowMs);
}

function classify(status: number): ToleErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "bad_response";
}

export class ToleClient {
  readonly environment: ToleEnvironment;
  private o: Required<Omit<ToleClientOptions, "connectionId" | "logger" | "fetchImpl" | "sleep">> & { connectionId: string | null };
  private f: typeof fetch;
  private sleep: (ms: number) => Promise<void>;
  private logger: Logger;

  constructor(opts: ToleClientOptions) {
    if (!opts.apiKey || !/^tole_sk_/.test(opts.apiKey)) throw new ToleError("config", "TOLE_API_KEY is missing or malformed");
    const isTest = /^tole_sk_test_/.test(opts.apiKey);
    const isLive = /^tole_sk_live_/.test(opts.apiKey);
    if (opts.environment === "sandbox" && isLive) throw new ToleError("config", "Live key used with sandbox environment");
    if (opts.environment === "live" && isTest) throw new ToleError("config", "Test key used with live environment");
    if (opts.connectionId && !UUID_RE.test(opts.connectionId)) throw new ToleError("config", "TOLE_CONNECTION_ID must be a UUID");
    if (opts.environment === "sandbox" && !opts.connectionId) throw new ToleError("config", "TOLE_CONNECTION_ID is required for sandbox");
    this.environment = opts.environment;
    this.o = {
      apiKey: opts.apiKey,
      environment: opts.environment,
      connectionId: opts.connectionId || null,
      baseUrl: (opts.baseUrl || TOLE_BASE_URL).replace(/\/+$/, ""),
      timeoutMs: opts.timeoutMs ?? 10_000,
      readRetries: opts.readRetries ?? 3,
      backoffBaseMs: opts.backoffBaseMs ?? 400,
      maxRetryAfterMs: opts.maxRetryAfterMs ?? 30_000,
    };
    this.f = opts.fetchImpl || ((...a: Parameters<typeof fetch>) => fetch(...a));
    this.sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.logger = opts.logger || silentLogger;
  }

  private p(path: string): string {
    return (this.environment === "sandbox" ? "/sandbox" : "") + path;
  }

  private headers(extra: Record<string, string>, withConnection: boolean): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.o.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...extra,
    };
    if (withConnection && this.o.connectionId) h["X-Tole-Connection-Id"] = this.o.connectionId;
    return h;
  }

  /** Resolve a Location header, accepting only URLs on the configured API origin. */
  private resolveLocation(loc: string | null): string | null {
    if (!loc) return null;
    try {
      const base = new URL(this.o.baseUrl + "/");
      const u = new URL(loc, base);
      return u.origin === base.origin ? u.toString() : null;
    } catch {
      return null;
    }
  }

  private async raw(method: string, url: string, headers: Record<string, string>, body?: unknown): Promise<Response> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.o.timeoutMs);
    try {
      return await this.f(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
    } catch (e) {
      const aborted = (e as { name?: string })?.name === "AbortError" || ctl.signal.aborted;
      throw new ToleError(aborted ? "timeout" : "network", aborted ? `Tole request timed out after ${this.o.timeoutMs}ms` : "Network error calling Tole");
    } finally {
      clearTimeout(timer);
    }
  }

  private async errorFrom(res: Response): Promise<ToleError> {
    let code: string | null = null, message = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as Partial<ErrorResponse>;
      if (j && typeof j.code === "string") code = j.code;
      if (j && typeof j.message === "string") message = j.message;
    } catch { /* non-JSON error body */ }
    return new ToleError(classify(res.status), message, { status: res.status, code, retryAfterMs: parseRetryAfter(res.headers.get("Retry-After")) });
  }

  /** Safe read with bounded exponential backoff on timeout/network/429/5xx. Never used for mutations. */
  private async read<T>(op: string, url: string, withConnection: boolean): Promise<T> {
    let attempt = 0;
    for (;;) {
      attempt++;
      try {
        const res = await this.raw("GET", url, this.headers({}, withConnection));
        if (res.status === 200) return (await res.json()) as T;
        throw await this.errorFrom(res);
      } catch (e) {
        const err = e instanceof ToleError ? e : new ToleError("bad_response", "Unexpected response");
        const retryable = ["timeout", "network", "rate_limited", "server"].includes(err.kind);
        if (!retryable || attempt > this.o.readRetries) {
          this.logger.log("warn", "tole read failed", { op, kind: err.kind, status: err.status, code: err.code, attempt });
          throw err;
        }
        const backoff = this.o.backoffBaseMs * 2 ** (attempt - 1);
        const wait = Math.min(this.o.maxRetryAfterMs, Math.max(backoff, err.retryAfterMs ?? 0));
        this.logger.log("info", "tole read retry", { op, kind: err.kind, status: err.status, attempt, waitMs: wait });
        await this.sleep(wait);
      }
    }
  }

  /** Single-shot idempotent mutation. Never retried here; 202 outcomes are returned to the caller. */
  private async mutate<T>(op: string, path: string, idempotencyKey: string, body: unknown): Promise<MutationOutcome<T>> {
    if (!IDEMPOTENCY_RE.test(idempotencyKey)) throw new ToleError("config", "Idempotency-Key does not match the documented pattern");
    let res: Response;
    try {
      res = await this.raw("POST", this.o.baseUrl + this.p(path), this.headers({ "Idempotency-Key": idempotencyKey }, true), body);
    } catch (e) {
      const err = e as ToleError;
      // The request may or may not have reached Tole. Do not repeat automatically.
      this.logger.log("warn", "tole mutation transport failure", { op, kind: err.kind });
      return { state: "outcome_unknown", commandId: null, reason: err.kind === "timeout" ? "timeout" : "network" };
    }
    if (res.status === 200 || res.status === 201) {
      const j = (await res.json()) as SuccessResponse<T> & { replayed?: boolean };
      if (!j || j.ok !== true || typeof j.data !== "object") throw new ToleError("bad_response", "Malformed success response", { status: res.status });
      this.logger.log("info", "tole mutation completed", { op, status: res.status, commandId: j.commandId ?? null, replayed: !!j.replayed });
      return { state: "completed", httpStatus: res.status, data: j.data, commandId: j.commandId ?? null, replayed: !!j.replayed };
    }
    if (res.status === 202) {
      const j = (await res.json()) as CommandPendingResponse | CommandOutcomeUnknownResponse;
      if (j?.kind === "in_progress" && j.commandId) {
        const retryAfterMs = parseRetryAfter(res.headers.get("Retry-After"));
        this.logger.log("info", "tole mutation in progress", { op, commandId: j.commandId, retryAfterMs });
        return { state: "in_progress", commandId: j.commandId, retryAfterMs, location: this.resolveLocation(res.headers.get("Location")) };
      }
      if (j?.kind === "outcome_unknown") {
        this.logger.log("warn", "tole mutation outcome unknown", { op, commandId: j.commandId ?? null });
        return { state: "outcome_unknown", commandId: j.commandId ?? null, reason: "provider" };
      }
      throw new ToleError("bad_response", "Unrecognised 202 body", { status: 202 });
    }
    const err = await this.errorFrom(res);
    this.logger.log("warn", "tole mutation rejected", { op, kind: err.kind, status: err.status, code: err.code });
    throw err;
  }

  // ---- Public operations ---------------------------------------------------------------------

  createQr(req: CreateQrRequest, idempotencyKey: string): Promise<MutationOutcome<QrOperationData>> {
    if (!Number.isInteger(req.amount) || req.amount < 1 || req.amount > 100_000_000) throw new ToleError("validation", "amount must be an integer 1..100000000");
    if ((req.latitude === undefined) !== (req.longitude === undefined)) throw new ToleError("validation", "latitude and longitude must be sent together");
    return this.mutate<QrOperationData>("createQr", "/qr", idempotencyKey, req);
  }

  createInvoice(req: CreateInvoiceRequest, idempotencyKey: string): Promise<MutationOutcome<Record<string, unknown>>> {
    if (!/^\+?7[0-9]{10}$/.test(req.phoneNumber)) throw new ToleError("validation", "phoneNumber must match ^\\+?7[0-9]{10}$");
    if (!Number.isInteger(req.amount) || req.amount < 1 || req.amount > 100_000_000) throw new ToleError("validation", "amount must be an integer 1..100000000");
    if (req.comment !== undefined && req.comment.length > 200) throw new ToleError("validation", "comment must be at most 200 characters");
    return this.mutate("createInvoice", "/invoices", idempotencyKey, req);
  }

  getQr(operationId: string): Promise<SuccessResponse<QrOperationData>> {
    if (!UUID_RE.test(operationId)) throw new ToleError("validation", "operationId must be a UUID");
    return this.read("getQr", `${this.o.baseUrl}${this.p("/qr/" + operationId)}`, true);
  }

  /** Live: GET /payment-intents/qr/{id} (or /invoices/{id}); sandbox: GET /sandbox/payment-intents/{id}. */
  async getPaymentIntent(kind: "qr" | "invoice", paymentIntentId: string): Promise<PaymentIntent> {
    if (!UUID_RE.test(paymentIntentId)) throw new ToleError("validation", "paymentIntentId must be a UUID");
    const path = this.environment === "sandbox"
      ? `/sandbox/payment-intents/${paymentIntentId}`
      : `/payment-intents/${kind === "qr" ? "qr" : "invoices"}/${paymentIntentId}`;
    const j = await this.read<{ ok: true; data: PaymentIntent }>("getPaymentIntent", this.o.baseUrl + path, true);
    if (!j?.data?.id || !j.data.status) throw new ToleError("bad_response", "Malformed PaymentIntentResponse");
    return j.data;
  }

  /** GET /commands/{commandId} — the live route takes no connection header. */
  async getCommand(commandId: string, location?: string | null): Promise<CommandState> {
    if (!UUID_RE.test(commandId)) throw new ToleError("validation", "commandId must be a UUID");
    const url = location || `${this.o.baseUrl}${this.p("/commands/" + commandId)}`;
    const j = await this.read<SuccessResponse<CommandState>>("getCommand", url, false);
    if (!j?.data) throw new ToleError("bad_response", "Malformed command response");
    return { ...j.data, commandId: j.data.commandId || commandId };
  }

  /**
   * Poll a 202 in_progress command, honoring Retry-After, within a bounded wall-clock budget.
   * Returns the terminal command (one that carries `result`) or null if still pending at the deadline.
   */
  async waitForCommand(commandId: string, opts: { retryAfterMs?: number | null; location?: string | null; budgetMs?: number } = {}): Promise<CommandState | null> {
    const budget = opts.budgetMs ?? 8_000;
    let waited = 0;
    let delay = Math.min(this.o.maxRetryAfterMs, opts.retryAfterMs ?? 1_000);
    while (waited + delay <= budget) {
      await this.sleep(delay);
      waited += delay;
      const cmd = await this.getCommand(commandId, opts.location);
      if (isCommandTerminal(cmd)) return cmd;
      delay = Math.min(this.o.maxRetryAfterMs, Math.max(1_000, delay * 2));
    }
    return null;
  }

  /** GET /api-key (getCurrentApiKey, ApiKeyBearer) — used only to verify the key is accepted. Body is not returned. */
  async verifyApiKey(): Promise<true> {
    await this.read<unknown>("getCurrentApiKey", `${this.o.baseUrl}/api-key`, false);
    return true;
  }

  /** GET /webhook-deliveries (listWebhookDeliveries) — diagnostics only; returns the raw array. */
  async listWebhookDeliveries(environment?: ToleEnvironment): Promise<Record<string, unknown>[]> {
    const q = environment ? `?environment=${environment}` : "";
    const j = await this.read<unknown>("listWebhookDeliveries", `${this.o.baseUrl}/webhook-deliveries${q}`, false);
    const arr = Array.isArray(j) ? j : Array.isArray((j as { data?: unknown })?.data) ? (j as { data: unknown[] }).data : [];
    return arr as Record<string, unknown>[];
  }

  /** Sandbox-only helper used by the smoke script. */
  async sandboxSimulate(paymentIntentId: string, status: "paid" | "cancelled" | "expired" | "failed"): Promise<PaymentIntent> {
    if (this.environment !== "sandbox") throw new ToleError("config", "simulate is sandbox-only");
    const res = await this.raw("POST", `${this.o.baseUrl}/sandbox/payment-intents/${paymentIntentId}/simulate`, this.headers({}, true), { status });
    if (res.status < 200 || res.status >= 300) throw await this.errorFrom(res);
    const j = (await res.json().catch(() => null)) as { data?: PaymentIntent } | null;
    return (j?.data ?? null) as PaymentIntent;
  }
}

export function isCommandTerminal(c: CommandState | null): boolean {
  return !!c && c.result != null && typeof c.result === "object";
}
