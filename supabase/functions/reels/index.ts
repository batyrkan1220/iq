// IQly admin: Claude-powered Reels planner. Only public.admins may call it.
// Actions: status | save_key | questions | voice_plan
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const MODEL = "claude-opus-5-5";

async function claude(key: string, system: string, user: string, maxTokens = 3000) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error("Claude API " + r.status + ": " + t.slice(0, 300));
  const d = JSON.parse(t);
  const txt = (d.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
  const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("Claude JSON қайтармады");
  return JSON.parse(txt.slice(a, b + 1));
}

const LANGN: Record<string, string> = { kz: "Kazakh (қазақ тілі)", ru: "Russian" };

const SYS_Q = `You write short logic riddles for vertical TikTok / Instagram Reels videos that advertise an online IQ test in Kazakhstan.
Rules for every riddle:
- Plain, everyday wording that any adult understands. No rare, bookish, dialect or scientific words (bad examples in Kazakh: "тұңғиық", "итбалық"). Use common names, objects and situations from everyday life in Kazakhstan.
- Exactly ONE indisputable correct answer. No wordplay that depends on translation, no ambiguity, no trick that native speakers would argue is unfair. Double-check the arithmetic.
- Medium difficulty: solvable in 5–10 seconds, but with a tempting wrong answer (a "trap").
- Short: the on-screen text must be at most 5 lines of at most 26 characters each. Use digits on screen.
- The 5 riddles must be of DIFFERENT types (e.g. number sequence, age puzzle, calendar/time, trick question, counting/spatial, comparison/ordering, classic math trap, odd-one-out).
- Do not repeat or closely resemble any riddle in the "avoid" list.
Return ONLY JSON, no prose:
{"questions":[{"type":"short type name in the target language","q_screen":"on-screen text, lines separated by \\n","q_voice":"the same question for a voice-over: numbers written out as words, natural spoken sentence(s)","answer":"short answer for screen, e.g. 8 күнде","answer_voice":"answer as spoken words","why":"one short line explaining the answer","trap":"the common wrong answer","difficulty":1-5}]}`;

const SYS_V = `You plan the voice-over for a 12–25 second vertical Reels video that shows ONE logic riddle, then a 5-second countdown.
Formats:
- "comment": the answer is NOT revealed. Hook at the start, the riddle, then after the countdown an outro that asks viewers to write their answer in the comments.
- "answer": hook, riddle, countdown, then the correct answer with a one-line explanation, then an outro inviting viewers to press the «Подробнее» button and take the IQ test. The word «Подробнее» always stays in Russian.
Hook rules: short (max 8 spoken words), challenging/provocative but never insulting, never invent statistics or percentages. On-screen hook max 2 lines of 28 characters.
Voice choice: pick the most suitable voice from the provided list (prefer cloned/professional voices that suit an energetic but trustworthy narrator) and suggest ElevenLabs settings (stability 0–1, similarity 0–1, style 0–1, speed 0.7–1.2).
All spoken text must be in the target language, plain everyday words, numbers written as words.
Return ONLY JSON:
{"hook_screen":"…","hook_voice":"…","question_voice":"…","answer_voice":"… or empty for comment","outro_screen_title":"…","outro_screen_sub":"…","outro_button":"…","outro_voice":"…","voice_id":"…","voice_name":"…","settings":{"stability":0.5,"similarity":0.75,"style":0.2,"speed":1.0},"reason":"1–2 sentences in Kazakh explaining the voice/settings choice"}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    const email = u?.user?.email;
    if (!email) return json({ error: "unauthorized" }, 401);
    const { data: isAdm } = await admin.from("admins").select("email").eq("email", email).maybeSingle();
    if (!isAdm) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "save_key") {
      const k = String(body.key || "").trim();
      if (!k.startsWith("sk-ant-")) return json({ error: "Anthropic кілті sk-ant- деп басталуы керек" }, 400);
      const t = await fetch("https://api.anthropic.com/v1/models", { headers: { "x-api-key": k, "anthropic-version": "2023-06-01" } });
      if (!t.ok) return json({ error: "Anthropic кілтті қабылдамады (" + t.status + ")" }, 400);
      await admin.from("app_secrets").upsert({ name: "anthropic", value: k, updated_at: new Date().toISOString() });
      return json({ ok: true });
    }
    const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "anthropic").maybeSingle();
    const key = sec?.value;
    if (action === "status") return json({ connected: !!key, model: MODEL });
    if (!key) return json({ error: "Anthropic API кілті енгізілмеген" }, 400);

    const lang = body.lang === "ru" ? "ru" : "kz";
    if (action === "questions") {
      const { data: prev } = await admin.from("reels").select("question").order("created_at", { ascending: false }).limit(60);
      const avoid = [
        ...(prev || []).map((p: any) => p.question?.q_screen).filter(Boolean),
        ...(Array.isArray(body.avoid) ? body.avoid : []),
      ].slice(0, 80);
      const user = `Target language: ${LANGN[lang]}.
Write 5 new riddles.${body.hint ? "\nExtra wish from the admin: " + String(body.hint).slice(0, 300) : ""}
Avoid list:\n${avoid.map((a: string) => "- " + String(a).replace(/\n/g, " ")).join("\n") || "(empty)"}`;
      const out = await claude(key, SYS_Q, user, 3500);
      return json(out);
    }
    if (action === "voice_plan") {
      const q = body.question || {};
      const voices = (body.voices || []).slice(0, 40);
      const user = `Target language: ${LANGN[lang]}. Format: ${body.format === "answer" ? "answer" : "comment"}.
Riddle: ${JSON.stringify(q)}
Available ElevenLabs voices: ${JSON.stringify(voices)}`;
      const out = await claude(key, SYS_V, user, 1500);
      return json(out);
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
