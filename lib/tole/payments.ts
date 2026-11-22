// Domain service: one-time Kaspi QR payment that unlocks an IQ test result.
// Storage is abstracted behind PaymentRepo so the flow is testable without a database.

import { type CommandState, isCommandTerminal, type PaymentIntent, type QrOperationData, ToleClient, ToleError } from "./client.ts";
import type { Logger } from "./log.ts";
import type { ToleWebhookEvent } from "./webhook.ts";

export type LocalStatus =
  | "creating" // row stored, create request not yet confirmed by Tole
  | "processing" // Tole answered 202 in_progress
  | "outcome_unknown" // Tole answered 202 outcome_unknown, or the transport failed mid-request
  | "pending" // QR issued, waiting for the payer
  | "paid" | "cancelled" | "expired" | "failed" | "partially_refunded" | "refunded"
  | "rejected"; // Tole rejected the create request (4xx); a new order is required

export interface PaymentRow {
  id: number;
  order_id: string;
  visit_id: string | null;
  provider: "tole";
  kind: "qr" | "invoice";
  environment: "live" | "sandbox";
  amount: number;
  currency: "KZT";
  status: LocalStatus;
  idempotency_key: string;
  tole_id: string | null; // Tole local resource id == paymentIntentId (public UUID, never a Kaspi id)
  tole_command_id: string | null;
  tole_status: string | null;
  payment_url: string | null;
  qr_token: string | null;
  expires_at: string | null;
  paid_at: string | null;
  last_reconciled_at: string | null;
  last_error_code: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRepo {
  findByOrderId(orderId: string): Promise<PaymentRow | null>;
  findByToleId(toleId: string): Promise<PaymentRow | null>;
  /** Insert; on unique-conflict (order_id) return the existing row instead. */
  insertOrGet(row: Omit<PaymentRow, "id" | "created_at" | "updated_at">): Promise<PaymentRow>;
  update(id: number, patch: Partial<PaymentRow>): Promise<PaymentRow>;
  listOpen(limit: number, sinceIso: string): Promise<PaymentRow[]>;
  countRecentForVisit(visitId: string, sinceIso: string): Promise<number>;
  /** Durable webhook inbox. Returns "duplicate" when webhook_id was already stored. */
  insertWebhook(e: { webhook_id: string; event_id: string; event_type: string; environment: string | null; event_created_at: string | null; ref: Record<string, unknown> }): Promise<"inserted" | "duplicate">;
  markWebhook(webhookId: string, status: "processed" | "failed", errorCode?: string | null): Promise<void>;
}

export interface PublicPaymentView {
  orderId: string;
  status: LocalStatus;
  paid: boolean;
  amount: number;
  paymentUrl: string | null;
  qrToken: string | null;
  expiresAt: string | null;
  retryable: boolean; // client may call create again (same order) later
}

const OPEN: LocalStatus[] = ["creating", "processing", "outcome_unknown", "pending"];
const TERMINAL_FROM_INTENT: Record<string, LocalStatus> = {
  pending: "pending", paid: "paid", cancelled: "cancelled", expired: "expired", failed: "failed",
  partially_refunded: "partially_refunded", refunded: "refunded",
};

export function idempotencyKeyFor(orderId: string, kind: "qr" | "invoice" = "qr"): string {
  // stable per local business operation; matches ^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$
  return kind === "invoice" ? `iqtest-inv-${orderId}` : `iqtest-qr-${orderId}`;
}

/** Normalise a KZ mobile number to the documented ^\+?7[0-9]{10}$ form (returns null when invalid). */
export function normalizeKzPhone(input: string): string | null {
  let p = String(input || "").replace(/[^\d+]/g, "");
  if (/^8\d{10}$/.test(p)) p = "7" + p.slice(1);
  if (/^\+7\d{10}$/.test(p)) p = p.slice(1);
  return /^7\d{10}$/.test(p) ? p : null;
}

export function toPublic(r: PaymentRow): PublicPaymentView {
  return {
    orderId: r.order_id,
    status: r.status,
    paid: r.status === "paid" || r.status === "partially_refunded",
    amount: r.amount,
    paymentUrl: r.status === "pending" ? r.payment_url : null,
    qrToken: r.status === "pending" ? r.qr_token : null,
    expiresAt: r.expires_at,
    retryable: r.status === "creating",
  };
}

export interface PaymentServiceDeps {
  client: ToleClient;
  repo: PaymentRepo;
  logger: Logger;
  /** Current price in KZT for one result unlock (admin-managed; read server-side, never from the client). */
  price: () => Promise<number>;
  now?: () => number;
  reconcileMinIntervalMs?: number; // throttle provider reads from client polling, default 3s
  maxOrdersPerVisitPerHour?: number; // default 6
}

export class PaymentService {
  private d: Required<Omit<PaymentServiceDeps, "now">> & { now: () => number };
  constructor(deps: PaymentServiceDeps) {
    this.d = { reconcileMinIntervalMs: 3_000, maxOrdersPerVisitPerHour: 6, now: () => Date.now(), ...deps };
  }

  private iso(ms = this.d.now()) { return new Date(ms).toISOString(); }

  /** Create (or resume) the QR payment for an order. Safe to call repeatedly with the same orderId. */
  async startQr(orderId: string, visitId: string | null): Promise<PublicPaymentView> {
    return this.start(orderId, visitId, "qr", null);
  }

  /** Kaspi invoice to the payer's phone. The phone is stored in payments.phone (admin-only, RLS) for the client list; never logged. */
  async startInvoice(orderId: string, visitId: string | null, phone: string): Promise<PublicPaymentView> {
    const p = normalizeKzPhone(phone);
    if (!p) throw new ToleError("validation", "bad_phone", { code: "bad_phone" });
    return this.start(orderId, visitId, "invoice", p);
  }

  private async start(orderId: string, visitId: string | null, kind: "qr" | "invoice", phone: string | null): Promise<PublicPaymentView> {
    let row = await this.d.repo.findByOrderId(orderId);
    if (!row) {
      if (visitId) {
        const n = await this.d.repo.countRecentForVisit(visitId, this.iso(this.d.now() - 3600_000));
        if (n >= this.d.maxOrdersPerVisitPerHour) throw new ToleError("rate_limited", "Too many payment attempts", { retryAfterMs: 600_000 });
      }
      const amount = await this.d.price();
      if (!Number.isInteger(amount) || amount < 1 || amount > 100_000_000) throw new ToleError("config", "Price is not configured");
      row = await this.d.repo.insertOrGet({
        order_id: orderId, visit_id: visitId, provider: "tole", kind, environment: this.d.client.environment,
        amount, currency: "KZT", status: "creating", idempotency_key: idempotencyKeyFor(orderId, kind),
        tole_id: null, tole_command_id: null, tole_status: null, payment_url: null, qr_token: null, expires_at: null,
        paid_at: null, last_reconciled_at: null, last_error_code: null,
      });
    }
    // Only a row that never got a definitive answer is (re)sent — with the SAME idempotency key, so Tole replays.
    if (row.kind !== kind) throw new ToleError("conflict", "order_kind_mismatch", { code: "order_kind_mismatch" });
    if (row.status === "creating") {
      if (kind === "invoice" && !phone) throw new ToleError("validation", "bad_phone", { code: "bad_phone" });
      if (phone) await this.d.repo.update(row.id, { note: `***${phone.slice(-4)}`, phone } as Partial<PaymentRow>);
      return toPublic(await this.sendCreate(row, phone));
    }
    return this.refresh(row);
  }

  /** Status for client polling; reconciles with Tole when due. Never re-sends a mutation. */
  async status(orderId: string): Promise<PublicPaymentView | null> {
    const row = await this.d.repo.findByOrderId(orderId);
    return row ? this.refresh(row) : null;
  }

  private async sendCreate(row: PaymentRow, phone: string | null = null): Promise<PaymentRow> {
    let outcome;
    try {
      outcome = row.kind === "invoice"
        ? await this.d.client.createInvoice({ phoneNumber: phone!, amount: row.amount, comment: "iqtest.live — IQ тест нәтижесі" }, row.idempotency_key)
        : await this.d.client.createQr({ amount: row.amount }, row.idempotency_key);
    } catch (e) {
      const err = e as ToleError;
      if (err.kind === "validation" || err.kind === "conflict" || err.kind === "not_found") {
        return this.d.repo.update(row.id, { status: "rejected", last_error_code: err.code || err.kind, updated_at: this.iso() });
      }
      // auth/config/rate-limit/server: keep "creating" so a later call re-sends with the same key.
      await this.d.repo.update(row.id, { last_error_code: err.code || err.kind, updated_at: this.iso() });
      throw err;
    }
    if (outcome.state === "completed") return this.applyCreated(row, outcome.data, outcome.commandId);
    if (outcome.state === "in_progress") {
      row = await this.d.repo.update(row.id, { status: "processing", tole_command_id: outcome.commandId, updated_at: this.iso() });
      const cmd = await this.d.client.waitForCommand(outcome.commandId, { retryAfterMs: outcome.retryAfterMs, location: outcome.location, budgetMs: 6_000 }).catch(() => null);
      return cmd ? this.applyCommand(row, cmd) : row;
    }
    // outcome_unknown: never repeat the mutation. Persist and reconcile from the command when we have one.
    row = await this.d.repo.update(row.id, {
      status: outcome.commandId ? "outcome_unknown" : "creating",
      tole_command_id: outcome.commandId, last_error_code: `outcome_unknown:${outcome.reason}`, updated_at: this.iso(),
    });
    // Transport failure without a commandId: the row stays "creating"; the next explicit startQr call re-sends
    // the identical idempotent request, which Tole answers with the stored result instead of a new QR.
    if (outcome.commandId) {
      const cmd = await this.d.client.getCommand(outcome.commandId).catch(() => null);
      if (cmd && isCommandTerminal(cmd)) return this.applyCommand(row, cmd);
    }
    return row;
  }

  private async applyCreated(row: PaymentRow, data: QrOperationData, commandId: string | null): Promise<PaymentRow> {
    if (!data || typeof data.id !== "string") {
      this.d.logger.log("error", "tole create returned no id", { orderId: row.order_id });
      return this.d.repo.update(row.id, { status: "outcome_unknown", tole_command_id: commandId ?? row.tole_command_id, last_error_code: "missing_id", updated_at: this.iso() });
    }
    const st = String(data.status || "");
    const local: LocalStatus = st === "created" || st === "" ? "pending" : (TERMINAL_FROM_INTENT[st] || "pending");
    this.d.logger.log("info", "qr payment issued", { orderId: row.order_id, toleId: data.id, commandId, status: local });
    return this.d.repo.update(row.id, {
      status: local, tole_id: data.id, tole_command_id: commandId ?? row.tole_command_id, tole_status: st || null,
      payment_url: typeof data.paymentUrl === "string" ? data.paymentUrl : null,
      qr_token: typeof data.qrToken === "string" ? data.qrToken : null,
      expires_at: typeof data.expiresAt === "string" ? data.expiresAt : null,
      last_error_code: null, updated_at: this.iso(),
    });
  }

  private async applyCommand(row: PaymentRow, cmd: CommandState): Promise<PaymentRow> {
    const r = cmd.result;
    if (r && r.ok === true && r.data) return this.applyCreated(row, r.data as QrOperationData, cmd.commandId);
    if (r && r.ok === false) {
      return this.d.repo.update(row.id, { status: "rejected", last_error_code: `command_${cmd.status}`, updated_at: this.iso() });
    }
    return row;
  }

  /** Bring a row up to date. Reads only; never repeats a mutation. */
  async refresh(row: PaymentRow, force = false): Promise<PublicPaymentView> {
    const due = force || !row.last_reconciled_at || this.d.now() - Date.parse(row.last_reconciled_at) >= this.d.reconcileMinIntervalMs;
    if (!due || !OPEN.includes(row.status)) return toPublic(row);
    try {
      if ((row.status === "processing" || row.status === "outcome_unknown") && row.tole_command_id && !row.tole_id) {
        const cmd = await this.d.client.getCommand(row.tole_command_id);
        row = isCommandTerminal(cmd) ? await this.applyCommand(row, cmd) : row;
      }
      if (row.tole_id && OPEN.includes(row.status)) {
        const pi: PaymentIntent = await this.d.client.getPaymentIntent(row.kind === "invoice" ? "invoice" : "qr", row.tole_id);
        const next = TERMINAL_FROM_INTENT[pi.status] || row.status;
        if (next !== row.status) this.d.logger.log("info", "payment status changed", { orderId: row.order_id, toleId: row.tole_id, from: row.status, to: next });
        row = await this.d.repo.update(row.id, {
          status: next, tole_status: pi.status, paid_at: pi.paidAt ?? row.paid_at,
          last_reconciled_at: this.iso(), updated_at: this.iso(),
        });
      } else {
        row = await this.d.repo.update(row.id, { last_reconciled_at: this.iso() });
      }
    } catch (e) {
      const err = e as ToleError;
      this.d.logger.log("warn", "reconcile failed", { orderId: row.order_id, kind: err.kind, status: err.status });
    }
    return toPublic(row);
  }

  /** Webhook processing after durable acceptance. Payment events don't document a payment-intent id, so
   *  the event is treated as a signal and open payments are reconciled from the authoritative GET endpoints. */
  async processWebhook(ev: ToleWebhookEvent): Promise<void> {
    const pid = typeof ev.data?.paymentIntentId === "string" ? ev.data.paymentIntentId : null; // documented on recurring events
    if (pid) {
      const row = await this.d.repo.findByToleId(pid);
      if (row) { await this.refresh(row, true); return; }
    }
    if (!/^(payment|operation)\./.test(ev.type)) return;
    const open = await this.d.repo.listOpen(25, this.iso(this.d.now() - 48 * 3600_000));
    for (const r of open) await this.refresh(r, true);
  }
}
