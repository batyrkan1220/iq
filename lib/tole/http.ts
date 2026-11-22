// HTTP routes for the Render Node server (server.js delegates /api/* here).
//   GET  /api/pay/config   → { enabled, priceKzt }            public, no secrets
//   POST /api/pay          → { action:"create"|"status", orderId, visitId? }
//   POST /api/tole/webhook → Tole webhook (raw body verified before parsing)
// Secrets come only from Render environment variables (see docs/TOLE.md).
import type { IncomingMessage, ServerResponse } from "node:http";
import { ToleClient, ToleError, type ToleEnvironment } from "./client.ts";
import { consoleLogger } from "./log.ts";
import { PaymentService } from "./payments.ts";
import { restClient, restPaymentRepo, restSettings } from "./rest_repo.ts";
import { handleToleWebhook } from "./webhook_handler.ts";

const log = consoleLogger("pay");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_SUPABASE_URL = "https://dlhejkmuyyqvjzjxbwbg.supabase.co";

interface Ctx { client: ToleClient | null; call: ReturnType<typeof restClient> | null; sbUrl: string; sbKey: string; svc: PaymentService | null; settings: ReturnType<typeof restSettings> | null; repo: ReturnType<typeof restPaymentRepo> | null; webhookSecret: string | null; problem: string | null }
let ctx: Ctx | null = null;

function init(env: NodeJS.ProcessEnv = process.env): Ctx {
  const sbUrl = (env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const sbKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || "").trim();
  const webhookSecret = (env.TOLE_WEBHOOK_SECRET || "").trim() || null;
  if (!sbKey) return { client: null, call: null, sbUrl, sbKey, svc: null, settings: null, repo: null, webhookSecret, problem: "SUPABASE_SERVICE_ROLE_KEY not set" };
  const call = restClient({ url: sbUrl, serviceKey: sbKey });
  const repo = restPaymentRepo(call);
  const settings = restSettings(call);
  try {
    const environment = (env.TOLE_ENV || "").trim() as ToleEnvironment;
    if (environment !== "live" && environment !== "sandbox") throw new ToleError("config", "TOLE_ENV must be live or sandbox");
    const client = new ToleClient({ apiKey: (env.TOLE_API_KEY || "").trim(), environment, connectionId: (env.TOLE_CONNECTION_ID || "").trim() || null, logger: log });
    const svc = new PaymentService({
      client, repo, logger: log,
      price: async () => (await settings()).priceKzt ?? 0,
    });
    return { client, call, sbUrl, sbKey, svc, settings, repo, webhookSecret, problem: null };
  } catch (e) {
    return { client: null, call, sbUrl, sbKey, svc: null, settings, repo, webhookSecret, problem: (e as Error).message };
  }
}

function send(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra });
  res.end(JSON.stringify(body));
}

function readRaw(req: IncomingMessage, limit = 64 * 1024): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let n = 0;
    req.on("data", (c: Buffer) => { n += c.length; if (n > limit) { resolve(null); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", () => resolve(null));
  });
}

// Small in-memory limiter for the public endpoint (per IP, per minute).
const hits = new Map<string, { t: number; n: number }>();
function limited(ip: string, max = 40): boolean {
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > 60_000) { hits.set(ip, { t: now, n: 1 }); if (hits.size > 5000) hits.clear(); return false; }
  return ++h.n > max;
}

/** Returns true when the request was handled. */
export async function handleApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (!pathname.startsWith("/api/")) return false;
  if (!ctx) {
    ctx = init();
    if (ctx.problem) log.log("warn", "payments not fully configured", { problem: ctx.problem });
  }

  if (pathname === "/api/pay/config" && req.method === "GET") {
    try {
      const s = ctx.settings ? await ctx.settings() : { priceKzt: null, paywallEnabled: false };
      const enabled = !!(s.paywallEnabled && s.priceKzt && ctx.svc);
      send(res, 200, { enabled, priceKzt: enabled ? s.priceKzt : null });
    } catch {
      send(res, 200, { enabled: false, priceKzt: null });
    }
    return true;
  }

  if (pathname === "/api/pay" && req.method === "POST") {
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    if (limited(ip)) { send(res, 429, { error: "rate_limited", retryAfterSec: 60 }, { "Retry-After": "60" }); return true; }
    const raw = await readRaw(req, 4 * 1024);
    let body: { action?: string; orderId?: string; visitId?: string; method?: string; phone?: string; session?: string } = {};
    try { body = JSON.parse(raw?.toString("utf8") || "{}"); } catch { send(res, 400, { error: "bad_json" }); return true; }
    const orderId = String(body.orderId || "");
    const visitId = body.visitId && UUID.test(String(body.visitId)) ? String(body.visitId) : null;
    if (!UUID.test(orderId)) { send(res, 400, { error: "bad_order_id" }); return true; }
    if (!ctx.svc || !ctx.settings) { send(res, 503, { error: "payments_unavailable" }); return true; }
    try {
      if (body.action === "create") {
        const s = await ctx.settings();
        if (!s.paywallEnabled || !s.priceKzt) { send(res, 403, { error: "paywall_disabled" }); return true; }
        const out = body.method === "invoice" ? await ctx.svc.startInvoice(orderId, visitId, String(body.phone || "")) : await ctx.svc.startQr(orderId, visitId);
        // Link the saved test session (result link in emails) to the order actually being paid.
        if (ctx.call && body.session && UUID.test(String(body.session))) {
          try { await ctx.call("PATCH", `/test_sessions?token=eq.${String(body.session)}`, { order_id: orderId }, { Prefer: "return=minimal" }); }
          catch { log.log("warn", "session link failed", { orderId }); }
        }
        send(res, 200, out);
      } else if (body.action === "status") {
        const v = await ctx.svc.status(orderId);
        v ? send(res, 200, v) : send(res, 404, { error: "not_found" });
      } else send(res, 400, { error: "bad_action" });
    } catch (e) {
      const err = e instanceof ToleError ? e : null;
      log.log("error", "pay failed", { action: body.action, orderId, kind: err?.kind ?? "internal", status: err?.status ?? null });
      if (err?.code === "bad_phone") { send(res, 400, { error: "bad_phone" }); return true; }
      if (err?.code === "order_kind_mismatch") { send(res, 409, { error: "order_kind_mismatch" }); return true; }
      if (err?.kind === "rate_limited") {
        const s = Math.ceil((err.retryAfterMs ?? 30_000) / 1000);
        send(res, 429, { error: "rate_limited", retryAfterSec: s }, { "Retry-After": String(s) });
      } else if (err && ["config", "unauthorized", "forbidden"].includes(err.kind)) send(res, 503, { error: "payments_unavailable" });
      else send(res, 502, { error: "provider_error" });
    }
    return true;
  }

  if (pathname === "/api/pay/admin-invoice" && req.method === "POST") {
    const r = await adminInvoice(req, ctx);
    send(res, r.status, r.body);
    return true;
  }

  if (pathname === "/api/reels/quiz" && req.method === "POST") {
    const who = await requireAdmin(req, ctx);
    if (typeof who !== "string") { send(res, who.error === "forbidden" ? 403 : 401, who); return true; }
    const raw = await readRaw(req, 64 * 1024);
    let b: { lang?: string; n?: number; avoid?: string[] } = {};
    try { b = JSON.parse(raw?.toString("utf8") || "{}"); } catch { send(res, 400, { error: "bad_json" }); return true; }
    const { makeQuiz } = await import("../quizgen.ts");
    const out = await makeQuiz(b); // retries internally (up to 3 model calls)
    if (!out.ok) log.log("warn", "quizgen failed", { error: out.error.slice(0, 40) });
    send(res, out.ok ? 200 : 502, out);
    return true;
  }

  if (pathname === "/api/reels/illus" && req.method === "POST") {
    const who = await requireAdmin(req, ctx);
    if (typeof who !== "string") { send(res, who.error === "forbidden" ? 403 : 401, who); return true; }
    const raw = await readRaw(req, 8 * 1024);
    let b: { q?: string; o?: string[]; a?: number; lang?: string } = {};
    try { b = JSON.parse(raw?.toString("utf8") || "{}"); } catch { send(res, 400, { error: "bad_json" }); return true; }
    if (!b.q || !Array.isArray(b.o)) { send(res, 400, { error: "q_and_o_required" }); return true; }
    const { makeIllus, makeFlux, fluxConfigured } = await import("../illus.ts");
    const inp = { q: b.q, o: b.o, a: Number(b.a) || 0, lang: b.lang };
    // FLUX (Cloudflare, free daily quota) first; Claude SVG only if Cloudflare isn't configured.
    const out = fluxConfigured() ? await makeFlux(inp) : await makeIllus(inp);
    if (!out.ok) log.log("warn", "illus failed", { error: out.error.slice(0, 40) });
    send(res, out.ok ? 200 : 502, out);
    return true;
  }

  if (pathname === "/api/pay/check" && req.method === "POST") {
    send(res, 200, await adminCheck(req, ctx));
    return true;
  }

  if (pathname === "/api/tole/webhook" && req.method === "POST") {
    const raw = await readRaw(req);
    if (!raw) { res.writeHead(413).end(); return true; }
    if (!ctx.webhookSecret || !ctx.repo || !ctx.svc) {
      log.log("error", "webhook not configured");
      res.writeHead(503, { "Content-Type": "text/plain" }).end("not configured"); // non-2xx → Tole redelivers
      return true;
    }
    const h = (n: string) => { const v = req.headers[n]; return Array.isArray(v) ? v[0] : v ?? null; };
    const out = await handleToleWebhook({
      secret: ctx.webhookSecret,
      headers: { id: h("webhook-id"), timestamp: h("webhook-timestamp"), signature: h("webhook-signature") },
      rawBody: raw.toString("utf8"),
      repo: ctx.repo, service: ctx.svc, logger: log,
      defer: (p) => { p.catch(() => {}); }, // respond right after durable acceptance; process in background
    });
    res.writeHead(out.status, { "Content-Type": "text/plain" }).end(out.body);
    return true;
  }

  send(res, 404, { error: "not_found" });
  return true;
}

/** Verify the caller is a logged-in admin (Supabase Auth token + public.admins). Returns email or an error object. */
async function requireAdmin(req: IncomingMessage, c: Ctx): Promise<string | { ok: false; error: string }> {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token || !c.call || !c.sbKey) return { ok: false, error: c.call ? "unauthorized" : "supabase_key_missing" };
  try {
    const u = await fetch(`${c.sbUrl.replace(/\/+$/, "")}/auth/v1/user`, { headers: { apikey: c.sbKey, Authorization: `Bearer ${token}` } });
    if (u.status !== 200) return { ok: false, error: "unauthorized" };
    const email = String(((await u.json()) as { email?: string }).email || "").toLowerCase();
    const a = await c.call("GET", `/admins?select=email&email=eq.${encodeURIComponent(email)}`);
    if (a.status !== 200 || !(a.json as unknown[])?.length) return { ok: false, error: "forbidden" };
    return email;
  } catch {
    return { ok: false, error: "auth_check_failed" };
  }
}

/** Admin test: issue a real Kaspi invoice to a phone number (live or sandbox, per TOLE_ENV), poll, cancel.
 *  The phone number is sent to Tole only; it is never stored or logged (only the last 4 digits in `note`). */
async function adminInvoice(req: IncomingMessage, c: Ctx): Promise<{ status: number; body: Record<string, unknown> }> {
  const who = await requireAdmin(req, c);
  if (typeof who !== "string") return { status: who.error === "forbidden" ? 403 : 401, body: who };
  if (!c.client || !c.svc || !c.repo) return { status: 503, body: { ok: false, error: "payments_unavailable", problem: c.problem } };
  const raw = await readRaw(req, 4 * 1024);
  let b: { action?: string; phone?: string; amount?: number; orderId?: string } = {};
  try { b = JSON.parse(raw?.toString("utf8") || "{}"); } catch { return { status: 400, body: { ok: false, error: "bad_json" } }; }
  const view = (r: import("./payments.ts").PaymentRow) => ({ ok: true, orderId: r.order_id, status: r.status, toleStatus: r.tole_status, amount: r.amount, environment: r.environment, paidAt: r.paid_at, error: r.last_error_code });
  try {
    if (b.action === "create") {
      let phone = String(b.phone || "").replace(/[^\d+]/g, "");
      if (/^8\d{10}$/.test(phone)) phone = "7" + phone.slice(1);
      if (/^\+7\d{10}$/.test(phone)) phone = phone.slice(1);
      if (!/^7\d{10}$/.test(phone)) return { status: 400, body: { ok: false, error: "bad_phone" } };
      const amount = Number(b.amount);
      if (!Number.isInteger(amount) || amount < 1 || amount > 100_000) return { status: 400, body: { ok: false, error: "bad_amount" } };
      const orderId = crypto.randomUUID();
      const now = new Date().toISOString();
      let row = await c.repo.insertOrGet({
        order_id: orderId, visit_id: null, provider: "tole", kind: "invoice", environment: c.client.environment, amount, currency: "KZT",
        status: "creating", idempotency_key: `iqtest-inv-${orderId}`, tole_id: null, tole_command_id: null, tole_status: null,
        payment_url: null, qr_token: null, expires_at: null, paid_at: null, last_reconciled_at: null, last_error_code: null,
      } as never);
      await c.repo.update(row.id, { updated_at: now, ...( { note: `Админ тест · ${who} · ***${phone.slice(-4)}` } as Record<string, unknown>) } as never);
      const out = await c.client.createInvoice({ phoneNumber: phone, amount, comment: "iqtest.live тест" }, row.idempotency_key);
      if (out.state === "completed") {
        const id = typeof out.data.id === "string" ? out.data.id : null;
        row = await c.repo.update(row.id, { status: id ? "pending" : "outcome_unknown", tole_id: id, tole_command_id: out.commandId, tole_status: String(out.data.status || "") || null, updated_at: new Date().toISOString() });
      } else {
        row = await c.repo.update(row.id, { status: out.state === "in_progress" ? "processing" : "outcome_unknown", tole_command_id: out.commandId, last_error_code: out.state, updated_at: new Date().toISOString() });
      }
      log.log("info", "admin test invoice", { orderId, state: out.state, environment: c.client.environment });
      return { status: 200, body: view(row) };
    }
    const orderId = String(b.orderId || "");
    if (!UUID.test(orderId)) return { status: 400, body: { ok: false, error: "bad_order_id" } };
    let row = await c.repo.findByOrderId(orderId);
    if (!row) return { status: 404, body: { ok: false, error: "not_found" } };
    if (b.action === "status") {
      await c.svc.refresh(row, true);
      row = (await c.repo.findByOrderId(orderId))!;
      return { status: 200, body: view(row) };
    }
    if (b.action === "cancel") {
      if (!row.tole_id || row.status !== "pending") return { status: 409, body: { ok: false, error: "not_cancellable", status: row.status } };
      const out = await c.client.cancelInvoice(row.tole_id, `iqtest-inv-cancel-${orderId}`);
      await c.svc.refresh(row, true);
      row = (await c.repo.findByOrderId(orderId))!;
      return { status: 200, body: { ...view(row), cancel: out.state } };
    }
    return { status: 400, body: { ok: false, error: "bad_action" } };
  } catch (e) {
    const err = e as ToleError;
    log.log("warn", "admin test invoice failed", { kind: err.kind, status: err.status, code: err.code });
    return { status: 200, body: { ok: false, error: (err.kind || "internal") + (err.code ? ":" + err.code : ""), message: err.kind === "validation" || err.kind === "forbidden" ? String(err.message || "").slice(0, 200) : undefined } };
  }
}

/** Admin-only connectivity check. Never returns secret values — only booleans, statuses and error kinds. */
async function adminCheck(req: IncomingMessage, c: Ctx): Promise<Record<string, unknown>> {
  const who = await requireAdmin(req, c);
  if (typeof who !== "string") return who;
  const env = (process.env.TOLE_ENV || "").trim();
  const out: Record<string, unknown> = {
    ok: true, environment: env || null,
    apiKeySet: !!(process.env.TOLE_API_KEY || "").trim(), connectionIdSet: !!(process.env.TOLE_CONNECTION_ID || "").trim(),
    webhookSecretSet: !!c.webhookSecret, webhookSecretFormat: !c.webhookSecret ? "missing" : /^whsec_[A-Za-z0-9_-]{43}$/.test(c.webhookSecret) ? "documented" : /\s|^["']|["']$/.test(c.webhookSecret) ? "has_spaces_or_quotes" : "nonstandard",
    configProblem: c.problem,
  };
  // 2) Supabase service key works (it already passed the admin lookup above)
  out.supabase = "ok";
  if (!c.client || !c.svc) return out;
  // 3) Tole accepts the API key
  try { await c.client.verifyApiKey(); out.toleKey = "ok"; } catch (e) { out.toleKey = (e as ToleError).kind || "error"; }
  // 4) Sandbox only: full payment round-trip + webhook delivery
  if (c.client.environment !== "sandbox") { out.sandboxPayment = "skipped_live"; return out; }
  const started = new Date(Date.now() - 2000).toISOString();
  const svc = new PaymentService({ client: c.client, repo: c.repo!, logger: log, price: async () => 100 });
  const orderId = crypto.randomUUID();
  try {
    const v = await svc.startQr(orderId, null);
    out.qrCreated = v.status;
    const row = await c.repo!.findByOrderId(orderId);
    if (row?.tole_id) {
      try { await c.client.sandboxSimulate(row.tole_id, "paid"); out.simulate = "ok"; } catch (e) { out.simulate = (e as ToleError).kind || "error"; }
      const after = await svc.refresh((await c.repo!.findByOrderId(orderId))!, true);
      out.sandboxPayment = after.status;
    } else out.sandboxPayment = v.status;
  } catch (e) {
    out.sandboxPayment = "error:" + ((e as ToleError).kind || "internal") + ((e as ToleError).code ? ":" + (e as ToleError).code : "");
  }
  // 5) Did a signed webhook reach /api/tole/webhook and pass verification?
  let received = 0;
  for (let i = 0; i < 8 && !received; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const w = await c.call("GET", `/tole_webhook_events?select=webhook_id&received_at=gte.${encodeURIComponent(started)}&limit=5`);
    received = w.status === 200 ? ((w.json as unknown[]) || []).length : 0;
  }
  out.webhookReceived = received > 0;
  // 6) What does Tole say about its deliveries? Only statuses/counts and field names — never payloads or URLs.
  try {
    const list = await c.client.listWebhookDeliveries(c.client.environment);
    const by: Record<string, number> = {};
    for (const d of list) { const st = typeof d.status === "string" ? d.status : "unknown"; by[st] = (by[st] || 0) + 1; }
    const last = list[0] || null;
    const safe: Record<string, unknown> = {};
    if (last) for (const [k, v] of Object.entries(last)) if (typeof v === "number" || typeof v === "boolean" || (typeof v === "string" && v.length < 60 && !/^https?:/i.test(v) && !/secret|token|url|body|payload|signature/i.test(k))) safe[k] = v;
    out.toleDeliveries = { total: list.length, byStatus: by, latest: safe };
  } catch (e) { out.toleDeliveries = "error:" + ((e as ToleError).kind || "internal") + ((e as ToleError).code ? ":" + (e as ToleError).code : ""); }
  return out;
}

/** Test hook: rebuild context from a given environment. */
export function _resetForTests(env?: NodeJS.ProcessEnv) { ctx = env ? init(env) : null; }
