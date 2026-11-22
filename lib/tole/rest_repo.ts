// PaymentRepo + admin settings backed by Supabase PostgREST, called from the Render server with the
// service-role key (env SUPABASE_SERVICE_ROLE_KEY). Tables stay admin-only for browsers via RLS.
import type { PaymentRepo, PaymentRow } from "./payments.ts";

const COLS = "id,order_id,visit_id,provider,kind,environment,amount,currency,status,idempotency_key,tole_id,tole_command_id,tole_status,payment_url,qr_token,expires_at,paid_at,last_reconciled_at,last_error_code,created_at,updated_at";

export interface RestOptions { url: string; serviceKey: string; fetchImpl?: typeof fetch; timeoutMs?: number }

export function restClient(o: RestOptions) {
  const base = o.url.replace(/\/+$/, "") + "/rest/v1";
  const f = o.fetchImpl || fetch;
  const auth: Record<string, string> = { apikey: o.serviceKey };
  if (o.serviceKey.startsWith("eyJ")) auth.Authorization = `Bearer ${o.serviceKey}`; // legacy JWT service_role key
  return async function call(method: string, path: string, body?: unknown, extra: Record<string, string> = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), o.timeoutMs ?? 8000);
    try {
      const res = await f(base + path, {
        method, signal: ctl.signal,
        headers: { ...auth, "Content-Type": "application/json", Accept: "application/json", ...extra },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
      return { status: res.status, json, headers: res.headers };
    } finally {
      clearTimeout(t);
    }
  };
}
type Call = ReturnType<typeof restClient>;

const dbErr = (status: number, j: unknown) => new Error(`db:${status}:${(j as { code?: string })?.code || ""}`);
const isUnique = (status: number, j: unknown) => status === 409 || (j as { code?: string })?.code === "23505";

export function restPaymentRepo(call: Call): PaymentRepo {
  const first = async (q: string): Promise<PaymentRow | null> => {
    const r = await call("GET", `/payments?select=${COLS}&${q}&limit=1`);
    if (r.status !== 200) throw dbErr(r.status, r.json);
    return ((r.json as PaymentRow[]) || [])[0] ?? null;
  };
  return {
    findByOrderId: (id) => first(`order_id=eq.${encodeURIComponent(id)}`),
    findByToleId: (id) => first(`tole_id=eq.${encodeURIComponent(id)}`),
    async insertOrGet(row) {
      const r = await call("POST", `/payments?select=${COLS}`, row, { Prefer: "return=representation" });
      if (r.status === 201) return (r.json as PaymentRow[])[0];
      if (isUnique(r.status, r.json)) {
        const ex = await first(`order_id=eq.${encodeURIComponent(row.order_id)}`);
        if (ex) return ex;
      }
      throw dbErr(r.status, r.json);
    },
    async update(id, patch) {
      const r = await call("PATCH", `/payments?id=eq.${id}&select=${COLS}`, patch, { Prefer: "return=representation" });
      if (r.status !== 200 || !(r.json as PaymentRow[])?.[0]) throw dbErr(r.status, r.json);
      return (r.json as PaymentRow[])[0];
    },
    async listOpen(limit, sinceIso) {
      const r = await call("GET", `/payments?select=${COLS}&provider=eq.tole&status=in.(creating,processing,outcome_unknown,pending)&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=${limit}`);
      if (r.status !== 200) throw dbErr(r.status, r.json);
      return (r.json as PaymentRow[]) || [];
    },
    async countRecentForVisit(visitId, sinceIso) {
      const r = await call("GET", `/payments?select=id&visit_id=eq.${encodeURIComponent(visitId)}&created_at=gte.${encodeURIComponent(sinceIso)}`, undefined, { Prefer: "count=exact", Range: "0-0" });
      if (r.status !== 200 && r.status !== 206) throw dbErr(r.status, r.json);
      const m = /\/(\d+)$/.exec(r.headers.get("content-range") || "");
      return m ? Number(m[1]) : ((r.json as unknown[]) || []).length;
    },
    async insertWebhook(e) {
      const r = await call("POST", "/tole_webhook_events", e, { Prefer: "return=minimal" });
      if (r.status === 201 || r.status === 204) return "inserted";
      if (isUnique(r.status, r.json)) return "duplicate";
      throw dbErr(r.status, r.json);
    },
    async markWebhook(webhookId, status, errorCode = null) {
      const r = await call("PATCH", `/tole_webhook_events?webhook_id=eq.${encodeURIComponent(webhookId)}`, { status, error_code: errorCode, processed_at: new Date().toISOString() }, { Prefer: "return=minimal" });
      if (r.status !== 204 && r.status !== 200) throw dbErr(r.status, r.json);
    },
  };
}

export interface PaySettings { priceKzt: number | null; paywallEnabled: boolean }

/** Admin-managed settings (app_settings), cached briefly so the price change applies within ~30s. */
export function restSettings(call: Call, ttlMs = 30_000) {
  let cache: { at: number; v: PaySettings } | null = null;
  return async function get(): Promise<PaySettings> {
    if (cache && Date.now() - cache.at < ttlMs) return cache.v;
    const r = await call("GET", "/app_settings?select=key,value&key=in.(price_kzt,paywall_enabled)");
    if (r.status !== 200) throw dbErr(r.status, r.json);
    const m = new Map(((r.json as { key: string; value: unknown }[]) || []).map((x) => [x.key, x.value]));
    const p = Number(m.get("price_kzt"));
    const v: PaySettings = { priceKzt: Number.isInteger(p) && p >= 1 && p <= 100_000_000 ? p : null, paywallEnabled: m.get("paywall_enabled") === true };
    cache = { at: Date.now(), v };
    return v;
  };
}
