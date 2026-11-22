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

interface Ctx { svc: PaymentService | null; settings: ReturnType<typeof restSettings> | null; repo: ReturnType<typeof restPaymentRepo> | null; webhookSecret: string | null; problem: string | null }
let ctx: Ctx | null = null;

function init(env: NodeJS.ProcessEnv = process.env): Ctx {
  const sbUrl = (env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const sbKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || "").trim();
  const webhookSecret = (env.TOLE_WEBHOOK_SECRET || "").trim() || null;
  if (!sbKey) return { svc: null, settings: null, repo: null, webhookSecret, problem: "SUPABASE_SERVICE_ROLE_KEY not set" };
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
    return { svc, settings, repo, webhookSecret, problem: null };
  } catch (e) {
    return { svc: null, settings, repo, webhookSecret, problem: (e as Error).message };
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
    let body: { action?: string; orderId?: string; visitId?: string } = {};
    try { body = JSON.parse(raw?.toString("utf8") || "{}"); } catch { send(res, 400, { error: "bad_json" }); return true; }
    const orderId = String(body.orderId || "");
    const visitId = body.visitId && UUID.test(String(body.visitId)) ? String(body.visitId) : null;
    if (!UUID.test(orderId)) { send(res, 400, { error: "bad_order_id" }); return true; }
    if (!ctx.svc || !ctx.settings) { send(res, 503, { error: "payments_unavailable" }); return true; }
    try {
      if (body.action === "create") {
        const s = await ctx.settings();
        if (!s.paywallEnabled || !s.priceKzt) { send(res, 403, { error: "paywall_disabled" }); return true; }
        send(res, 200, await ctx.svc.startQr(orderId, visitId));
      } else if (body.action === "status") {
        const v = await ctx.svc.status(orderId);
        v ? send(res, 200, v) : send(res, 404, { error: "not_found" });
      } else send(res, 400, { error: "bad_action" });
    } catch (e) {
      const err = e instanceof ToleError ? e : null;
      log.log("error", "pay failed", { action: body.action, orderId, kind: err?.kind ?? "internal", status: err?.status ?? null });
      if (err?.kind === "rate_limited") {
        const s = Math.ceil((err.retryAfterMs ?? 30_000) / 1000);
        send(res, 429, { error: "rate_limited", retryAfterSec: s }, { "Retry-After": String(s) });
      } else if (err && ["config", "unauthorized", "forbidden"].includes(err.kind)) send(res, 503, { error: "payments_unavailable" });
      else send(res, 502, { error: "provider_error" });
    }
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

/** Test hook: rebuild context from a given environment. */
export function _resetForTests(env?: NodeJS.ProcessEnv) { ctx = env ? init(env) : null; }
