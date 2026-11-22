// iqtest.live email sender: Supabase Edge Function → Resend API. Deploy with verify_jwt = false.
// Secrets (Supabase → Edge Functions → Secrets): RESEND_API_KEY (required), MAIL_FROM (optional).
// The reminders cron secret lives in Supabase Vault (mail_cron_secret) and is read via rpc mail_cron_secret().
// Actions (POST JSON):
//   {action:"result", token}      — after payment: email the result link to the address saved with that test session (once)
//   {action:"reminders"}          — cron (header x-cron-secret): unpaid sessions 30 min–24 h old get one "your result is ready" email
//   {action:"status"}             — admin: is Resend configured, domain status, counts
//   {action:"broadcast", subject, body, test?} — admin: newsletter to consenting, subscribed leads (test → only to the admin)
// GET ?unsub=<token>               — one-click unsubscribe page
// Never logs email bodies or full addresses.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://iqtest.live";
const FROM = Deno.env.get("MAIL_FROM") || "iqtest.live <noreply@iqtest.live>";
const RESEND = "https://api.resend.com";
const ORIGINS = new Set(["https://iqtest.live", "https://www.iqtest.live", "https://iqtest-live.onrender.com"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && (ORIGINS.has(o) || /^http:\/\/localhost:\d+$/.test(o)) ? o : SITE,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  Vary: "Origin",
});
const mask = (e: string) => e.replace(/^(.).*?(@.*)$/, "$1***$2");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const log = (msg: string, f: Record<string, unknown> = {}) => console.log(JSON.stringify({ ts: new Date().toISOString(), component: "mail", msg, ...f }));

// ---------------------------------------------------------------- templates
type Lang = "kz" | "ru";
const L = (lang: Lang, kz: string, ru: string) => (lang === "ru" ? ru : kz);

function layout(lang: Lang, title: string, inner: string, unsubUrl?: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f2fb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1d1b3a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2fb;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:22px 24px;color:#fff;font-size:20px;font-weight:800">iqtest<span style="color:#ff8fa3">.</span>live</td></tr>
<tr><td style="padding:26px 24px 8px"><h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">${title}</h1>${inner}</td></tr>
<tr><td style="padding:8px 24px 24px;font-size:12px;color:#8a8aa3;line-height:1.5">${L(lang, "Бұл хатты iqtest.live сайтында IQ тест тапсырғаныңыз үшін алдыңыз.", "Вы получили это письмо, потому что прошли IQ-тест на iqtest.live.")}${unsubUrl ? `<br><a href="${unsubUrl}" style="color:#8a8aa3">${L(lang, "Хаттардан бас тарту", "Отписаться от писем")}</a>` : ""}</td></tr>
</table></td></tr></table></body></html>`;
}
const button = (href: string, label: string) =>
  `<p style="margin:22px 0"><a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:14px;font-size:16px">${label}</a></p>`;

function resultMail(lang: Lang, link: string, iq: number | null, unsub: string) {
  const subject = L(lang, "Сіздің IQ нәтижеңіз дайын 🧠", "Ваш результат IQ готов 🧠");
  const iqLine = iq ? `<p style="font-size:15px;margin:0 0 6px">${L(lang, "Сіздің IQ", "Ваш IQ")}: <b style="font-size:28px;color:#4f46e5">${iq}</b></p>` : "";
  const html = layout(lang, subject, `${iqLine}<p style="font-size:15px;line-height:1.55;margin:0">${L(lang,
    "Толық нәтижеңіз — 5 қабілет профилі, тарихи тұлғалармен салыстыру және барлық сұрақтың түсіндірмесі — осы сілтеме бойынша кез келген уақытта ашылады.",
    "Полный результат — профиль 5 способностей, сравнение с историческими личностями и разбор всех вопросов — всегда доступен по этой ссылке.")}</p>${button(link, L(lang, "Нәтижені ашу →", "Открыть результат →"))}<p style="font-size:12.5px;color:#8a8aa3">${L(lang, "Сілтемені ешкімге бермеңіз — ол сіздің жеке нәтижеңізге апарады.", "Не передавайте ссылку — она ведёт к вашему личному результату.")}</p>`, unsub);
  return { subject, html, text: `${subject}\n${iq ? "IQ: " + iq + "\n" : ""}${link}` };
}

function reminderMail(lang: Lang, link: string, unsub: string) {
  const subject = L(lang, "Нәтижеңіз дайын — ашуға бір қадам қалды", "Ваш результат готов — остался один шаг");
  const html = layout(lang, subject, `<p style="font-size:15px;line-height:1.55;margin:0">${L(lang,
    "Сіз IQ тестті аяқтадыңыз, нәтижеңіз есептеліп қойды. Оны ашу үшін төмендегі батырманы басыңыз — тестті қайта тапсырудың қажеті жоқ.",
    "Вы прошли IQ-тест, результат уже рассчитан. Нажмите кнопку ниже, чтобы открыть его — проходить тест заново не нужно.")}</p>${button(link, L(lang, "Нәтижеге өту →", "Перейти к результату →"))}`, unsub);
  return { subject, html, text: `${subject}\n${link}` };
}

function broadcastMail(lang: Lang, subject: string, body: string, unsub: string) {
  const paras = esc(body).split(/\n{2,}/).map((p) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`).join("");
  const html = layout(lang, esc(subject), paras + button(`${SITE}/${lang}/`, L(lang, "iqtest.live сайтына өту →", "Перейти на iqtest.live →")), unsub);
  return { subject, html, text: `${body}\n\n${SITE}\n\n${L(lang, "Бас тарту", "Отписаться")}: ${unsub}` };
}

// ---------------------------------------------------------------- Resend
async function send(key: string, to: string, m: { subject: string; html: string; text: string }, unsub: string | null, idem?: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  if (idem) headers["Idempotency-Key"] = idem;
  const body: Record<string, unknown> = { from: FROM, to: [to], subject: m.subject, html: m.html, text: m.text };
  if (unsub) body.headers = { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10_000);
  try {
    const r = await fetch(`${RESEND}/emails`, { method: "POST", headers, body: JSON.stringify(body), signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true as const, id: String(j.id || "") } : { ok: false as const, error: `${r.status}:${String(j.name || j.message || "").slice(0, 80)}` };
  } catch (e) {
    return { ok: false as const, error: (e as Error).name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------- handler
Deno.serve(async (req) => {
  const H = cors(req.headers.get("Origin"));
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...H, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const key = Deno.env.get("RESEND_API_KEY") || "";
  const url = new URL(req.url);

  // One-click unsubscribe (GET link in emails, POST from mail clients' List-Unsubscribe-Post)
  const unsubTok = url.searchParams.get("unsub");
  if (unsubTok) {
    if (UUID.test(unsubTok)) {
      const { data: lead } = await sb.from("leads").select("email").eq("unsub_token", unsubTok).maybeSingle();
      if (lead?.email) await sb.from("leads").update({ unsubscribed_at: new Date().toISOString() }).eq("email", lead.email).is("unsubscribed_at", null);
    }
    return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#1d1b3a"><h2>✓ Хаттардан бас тарттыңыз</h2><p>Вы отписались от рассылки iqtest.live.</p><p><a href="${SITE}">iqtest.live</a></p></body>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const unsubUrlFor = async (email: string) => {
    const { data } = await sb.from("leads").select("unsub_token,unsubscribed_at").eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return { url: data?.unsub_token ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/mail?unsub=${data.unsub_token}` : null, unsubscribed: !!data?.unsubscribed_at };
  };
  const record = (kind: string, to: string, subject: string, r: { ok: boolean; id?: string; error?: string }, token?: string) =>
    sb.from("email_log").insert({ kind, to_email: to, subject, status: r.ok ? "sent" : "failed", provider_id: r.ok ? r.id : null, error: r.ok ? null : r.error, session_token: token ?? null });

  async function isAdmin(): Promise<string | null> {
    const tok = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!tok) return null;
    const { data } = await sb.auth.getUser(tok);
    const email = data?.user?.email?.toLowerCase();
    if (!email) return null;
    const { data: a } = await sb.from("admins").select("email").eq("email", email).maybeSingle();
    return a ? email : null;
  }

  // ---- result email (called by the site after payment / when the result is shown)
  if (b.action === "result") {
    const token = String(b.token || "");
    if (!UUID.test(token)) return json({ error: "bad_token" }, 400);
    if (!key) return json({ ok: false, error: "mail_not_configured" }, 503);
    const { data: s } = await sb.from("test_sessions").select("token,email,lang,visit_id,order_id,result_emailed_at").eq("token", token).maybeSingle();
    if (!s || !s.email) return json({ ok: false, error: "no_session" }, 404);
    if (s.result_emailed_at) return json({ ok: true, already: true });
    const { data: st } = await sb.rpc("get_test_session", { p_token: token });
    if (!st?.paid) return json({ ok: false, error: "not_paid" }, 402);
    // claim first so parallel calls can't double-send
    const { data: claimed } = await sb.from("test_sessions").update({ result_emailed_at: new Date().toISOString() }).eq("token", token).is("result_emailed_at", null).select("token");
    if (!claimed?.length) return json({ ok: true, already: true });
    const { data: res } = await sb.from("results").select("iq").eq("visit_id", s.visit_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const lang: Lang = s.lang === "ru" ? "ru" : "kz";
    const u = await unsubUrlFor(s.email);
    const m = resultMail(lang, `${SITE}/${lang}/?s=${token}`, res?.iq ?? null, u.url || `${SITE}/privacy/`);
    const r = await send(key, s.email, m, u.url, `result-${token}`);
    await record("result", s.email, m.subject, r, token);
    if (!r.ok) await sb.from("test_sessions").update({ result_emailed_at: null }).eq("token", token);
    log("result mail", { to: mask(s.email), ok: r.ok, error: r.ok ? null : r.error });
    return json({ ok: r.ok }, r.ok ? 200 : 502);
  }

  // ---- reminders (pg_cron every 10 min)
  if (b.action === "reminders") {
    const secret = Deno.env.get("CRON_SECRET") || String((await sb.rpc("mail_cron_secret")).data || "");
    if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "forbidden" }, 403);
    if (!key) return json({ ok: false, error: "mail_not_configured" }, 503);
    const now = Date.now();
    const { data: list } = await sb.from("test_sessions").select("token,email,lang,order_id,created_at")
      .not("email", "is", null).is("reminder_sent_at", null).is("result_emailed_at", null)
      .lte("created_at", new Date(now - 30 * 60_000).toISOString()).gte("created_at", new Date(now - 24 * 3600_000).toISOString())
      .order("created_at", { ascending: true }).limit(40);
    let sent = 0, skipped = 0;
    for (const s of list || []) {
      const { data: st } = await sb.rpc("get_test_session", { p_token: s.token });
      await sb.from("test_sessions").update({ reminder_sent_at: new Date().toISOString() }).eq("token", s.token);
      const u = await unsubUrlFor(s.email!);
      if (st?.paid || u.unsubscribed) { skipped++; continue; }
      const lang: Lang = s.lang === "ru" ? "ru" : "kz";
      const m = reminderMail(lang, `${SITE}/${lang}/?s=${s.token}`, u.url || `${SITE}/privacy/`);
      const r = await send(key, s.email!, m, u.url, `reminder-${s.token}`);
      await record("reminder", s.email!, m.subject, r, s.token);
      if (r.ok) sent++;
    }
    log("reminders", { candidates: list?.length || 0, sent, skipped });
    return json({ ok: true, sent, skipped });
  }

  // ---- admin actions
  if (b.action === "status" || b.action === "broadcast") {
    const admin = await isAdmin();
    if (!admin) return json({ error: "forbidden" }, 403);
    if (b.action === "status") {
      const out: Record<string, unknown> = { keySet: !!key, from: FROM, cronSecretSet: !!(Deno.env.get("CRON_SECRET") || (await sb.rpc("mail_cron_secret")).data) };
      if (key) {
        const r = await fetch(`${RESEND}/domains`, { headers: { Authorization: `Bearer ${key}` } });
        const j = await r.json().catch(() => ({}));
        out.resend = r.ok ? "ok" : `error:${r.status}`;
        if (r.ok) out.domains = (j.data || []).map((d: { name: string; status: string }) => ({ name: d.name, status: d.status }));
      }
      const { count: leads } = await sb.from("leads").select("id", { count: "exact", head: true });
      const { count: subs } = await sb.from("leads").select("id", { count: "exact", head: true }).eq("marketing_consent", true).is("unsubscribed_at", null);
      return json({ ...out, leads, subscribers: subs });
    }
    if (!key) return json({ ok: false, error: "mail_not_configured" }, 503);
    const subject = String(b.subject || "").trim().slice(0, 150), body = String(b.body || "").trim().slice(0, 8000);
    const lang: Lang = b.lang === "ru" ? "ru" : "kz";
    if (subject.length < 3 || body.length < 10) return json({ ok: false, error: "empty" }, 400);
    if (b.test) {
      const u = await unsubUrlFor(admin);
      const m = broadcastMail(lang, subject, body, u.url || `${SITE}/privacy/`);
      const r = await send(key, admin, m, u.url);
      await record("test", admin, m.subject, r);
      return json({ ok: r.ok, sent: r.ok ? 1 : 0, error: r.ok ? undefined : r.error });
    }
    const { data: rows } = await sb.from("leads").select("email,unsub_token").eq("marketing_consent", true).is("unsubscribed_at", null).limit(10000);
    const seen = new Set<string>();
    const items: { to: string; m: ReturnType<typeof broadcastMail>; unsub: string }[] = [];
    for (const row of rows || []) {
      const e = String(row.email).toLowerCase();
      if (seen.has(e)) continue;
      seen.add(e);
      const unsub = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mail?unsub=${row.unsub_token}`;
      items.push({ to: e, m: broadcastMail(lang, subject, body, unsub), unsub });
    }
    let sent = 0, failed = 0;
    for (let i = 0; i < items.length; i += 100) {
      const chunk = items.slice(i, i + 100);
      const payload = chunk.map((x) => ({ from: FROM, to: [x.to], subject: x.m.subject, html: x.m.html, text: x.m.text, headers: { "List-Unsubscribe": `<${x.unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }));
      let ok = false, ids: string[] = [], err = "";
      try {
        const r = await fetch(`${RESEND}/emails/batch`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const j = await r.json().catch(() => ({}));
        ok = r.ok; ids = (j.data || []).map((d: { id: string }) => d.id); err = ok ? "" : `${r.status}:${String(j.name || j.message || "").slice(0, 80)}`;
      } catch (e) { err = (e as Error).name; }
      await sb.from("email_log").insert(chunk.map((x, k) => ({ kind: "broadcast", to_email: x.to, subject: subject, status: ok ? "sent" : "failed", provider_id: ok ? ids[k] ?? null : null, error: ok ? null : err })));
      ok ? (sent += chunk.length) : (failed += chunk.length);
      await new Promise((res) => setTimeout(res, 600));
    }
    log("broadcast", { by: mask(admin), sent, failed });
    return json({ ok: true, sent, failed });
  }

  return json({ error: "bad_action" }, 400);
});
