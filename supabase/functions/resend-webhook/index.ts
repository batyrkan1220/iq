// Resend → iqtest.live webhook (deploy with verify_jwt = false). Secret: RESEND_WEBHOOK_SECRET (whsec_…).
// Verifies the Svix signature over the exact raw body, dedupes on svix-id, then:
//   email.sent/delivered/delivery_delayed/opened/clicked/bounced/complained/failed → updates email_log by provider_id
//   email.bounced / email.complained → marks the lead (excluded from future mail)
//   email.received → fetches the message via GET /emails/receiving/{id} and stores it in inbound_emails
import { createClient } from "npm:@supabase/supabase-js@2";

const enc = new TextEncoder();
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
async function verify(secret: string, id: string, ts: string, body: string, sigHeader: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000), t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(now - t) > 300) return false;
  const keyBytes = b64ToBytes(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${id}.${ts}.${body}`)));
  const expected = btoa(String.fromCharCode(...mac));
  return sigHeader.split(" ").some((part) => {
    const [ver, sig] = part.split(",");
    if (ver !== "v1" || !sig || sig.length !== expected.length) return false;
    let d = 0;
    for (let i = 0; i < sig.length; i++) d |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return d === 0;
  });
}
const log = (msg: string, f: Record<string, unknown> = {}) => console.log(JSON.stringify({ ts: new Date().toISOString(), component: "resend-webhook", msg, ...f }));

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET") || "";
  if (!secret) return new Response("not configured", { status: 503 });
  const raw = await req.text();
  const id = req.headers.get("svix-id") || "", ts = req.headers.get("svix-timestamp") || "", sig = req.headers.get("svix-signature") || "";
  if (!id || !ts || !sig || !(await verify(secret, id, ts, raw, sig))) return new Response("invalid signature", { status: 401 });

  let ev: { type?: string; created_at?: string; data?: Record<string, unknown> };
  try { ev = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  const type = String(ev.type || ""), data = ev.data || {}, emailId = typeof data.email_id === "string" ? data.email_id : null;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { error: dupErr } = await sb.from("email_events").insert({ svix_id: id, type, email_id: emailId, event_created_at: ev.created_at ?? null });
  if (dupErr) {
    if (dupErr.code === "23505") return new Response("duplicate", { status: 200 });
    log("persist failed", { code: dupErr.code });
    return new Response("persist failed", { status: 500 });
  }
  const at = ev.created_at || new Date().toISOString();

  try {
    if (type === "email.received" && emailId) {
      const key = Deno.env.get("RESEND_API_KEY") || "";
      const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, { headers: { Authorization: `Bearer ${key}` } });
      const m = r.ok ? await r.json() : {};
      const fromHeader = String((m.headers && (m.headers.from || m.headers.From)) || m.from || data.from || "");
      const nameMatch = fromHeader.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>/);
      await sb.from("inbound_emails").upsert({
        resend_id: emailId,
        received_at: m.created_at || at,
        from_email: String(data.from || m.from || "").replace(/^.*<([^>]+)>.*$/, "$1").toLowerCase(),
        from_name: nameMatch ? nameMatch[1].trim() : null,
        to_emails: m.to || data.to || [],
        subject: String(m.subject || data.subject || "").slice(0, 500),
        text_body: typeof m.text === "string" ? m.text.slice(0, 100_000) : null,
        html_body: typeof m.html === "string" ? m.html.slice(0, 300_000) : null,
        message_id: m.message_id || data.message_id || null,
      }, { onConflict: "resend_id", ignoreDuplicates: true });
      log("inbound stored", { ok: r.ok });
    } else if (emailId && type.startsWith("email.")) {
      const ev2 = type.slice(6);
      const patch: Record<string, unknown> = { last_event: ev2 };
      const col = { delivered: "delivered_at", opened: "opened_at", clicked: "clicked_at", bounced: "bounced_at", complained: "complained_at" }[ev2];
      if (col) patch[col] = at;
      if (ev2 === "failed") patch.status = "failed";
      // keep the strongest milestone in last_event: don't downgrade e.g. "opened" back to "delivered"
      const { data: row } = await sb.from("email_log").select("id,to_email,last_event").eq("provider_id", emailId).maybeSingle();
      const rank: Record<string, number> = { sent: 1, delivery_delayed: 2, delivered: 3, opened: 4, clicked: 5, failed: 6, bounced: 7, complained: 8 };
      if (row && (rank[row.last_event || ""] || 0) > (rank[ev2] || 0)) delete patch.last_event;
      if (row) await sb.from("email_log").update(patch).eq("id", row.id);
      const to = row?.to_email || (Array.isArray(data.to) ? String(data.to[0] || "") : "");
      if (to && ev2 === "bounced") await sb.from("leads").update({ bounced_at: at }).eq("email", to.toLowerCase()).is("bounced_at", null);
      if (to && ev2 === "complained") await sb.from("leads").update({ unsubscribed_at: at }).eq("email", to.toLowerCase()).is("unsubscribed_at", null);
    }
  } catch (e) {
    log("processing failed", { type, err: (e as Error).name });
  }
  return new Response("ok", { status: 200 });
});
