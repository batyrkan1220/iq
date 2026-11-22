import { ToleClient } from "../../lib/tole/client.ts";
import type { Logger, LogLevel } from "../../lib/tole/log.ts";
import type { PaymentRepo, PaymentRow } from "../../lib/tole/payments.ts";

export const TEST_KEY = "tole_sk_test_v1_" + "x".repeat(24); // fake, not a real credential
export const CONN = "11111111-2222-4333-8444-555555555555";
export const PI = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
export const CMD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

export interface Call { method: string; url: string; headers: Record<string, string>; body: unknown }
type Responder = (c: Call) => Response | Promise<Response> | "hang";

export function jsonRes(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

/** Scripted fetch: each request consumes the next responder. */
export function fakeFetch(responders: Responder[]) {
  const calls: Call[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const c: Call = {
      method: init?.method || "GET", url: String(input),
      headers: Object.fromEntries(Object.entries((init?.headers || {}) as Record<string, string>)),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(c);
    const r = responders.shift();
    if (!r) throw new Error("unexpected request " + c.method + " " + c.url);
    const out = r(c);
    if (out === "hang") {
      return new Promise<Response>((_, rej) => {
        init?.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })));
      });
    }
    return out;
  }) as typeof fetch;
  return { f, calls };
}

export function captureLogger() {
  const lines: { level: LogLevel; msg: string; fields?: Record<string, unknown> }[] = [];
  const logger: Logger = { log: (level, msg, fields) => lines.push({ level, msg, fields }) };
  return { logger, lines };
}

export function makeClient(responders: Responder[], over: Partial<ConstructorParameters<typeof ToleClient>[0]> = {}) {
  const ff = fakeFetch(responders);
  const sleeps: number[] = [];
  const cap = captureLogger();
  const client = new ToleClient({
    apiKey: TEST_KEY, environment: "sandbox", connectionId: CONN, fetchImpl: ff.f,
    sleep: async (ms) => { sleeps.push(ms); }, logger: cap.logger, timeoutMs: 50, ...over,
  });
  return { client, calls: ff.calls, sleeps, lines: cap.lines };
}

export function memoryRepo(): PaymentRepo & { rows: PaymentRow[]; hooks: Map<string, { status: string }> } {
  const rows: PaymentRow[] = [];
  const hooks = new Map<string, { status: string }>();
  let seq = 0;
  const now = () => new Date().toISOString();
  return {
    rows, hooks,
    async findByOrderId(o) { return rows.find((r) => r.order_id === o) ?? null; },
    async findByToleId(t) { return rows.find((r) => r.tole_id === t) ?? null; },
    async insertOrGet(row) {
      const ex = rows.find((r) => r.order_id === row.order_id);
      if (ex) return ex;
      const r = { ...row, id: ++seq, created_at: now(), updated_at: now() } as PaymentRow;
      rows.push(r);
      return r;
    },
    async update(id, patch) {
      const r = rows.find((x) => x.id === id)!;
      Object.assign(r, patch);
      return r;
    },
    async listOpen(limit) { return rows.filter((r) => ["creating", "processing", "outcome_unknown", "pending"].includes(r.status)).slice(0, limit); },
    async countRecentForVisit(v) { return rows.filter((r) => r.visit_id === v).length; },
    async insertWebhook(e) {
      if (hooks.has(e.webhook_id)) return "duplicate";
      hooks.set(e.webhook_id, { status: "received" });
      return "inserted";
    },
    async markWebhook(id, status) { hooks.set(id, { status }); },
  };
}

export const qrCreated = (over: Record<string, unknown> = {}) => ({
  ok: true,
  data: { id: PI, kind: "qr", status: "created", amount: 1990, paymentUrl: "https://pay.example/xyz", qrToken: "https://qr.kaspi.kz/abc", expiresAt: "2026-11-22T13:00:00Z", ...over },
  commandId: CMD, replayed: false,
});

export const intent = (status: string) => ({
  ok: true,
  data: {
    id: PI, kind: "qr", status, amount: 1990, currency: "KZT", revision: 2, createdAt: "2026-11-22T12:00:00Z", updatedAt: "2026-11-22T12:01:00Z",
    source: null, recurringInvoiceId: null, occurrenceId: null, attemptNumber: null, paidAt: status === "paid" ? "2026-11-22T12:01:00Z" : null,
  },
});
