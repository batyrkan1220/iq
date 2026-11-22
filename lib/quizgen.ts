// Reels quiz questions written by Claude (Anthropic API). Key: ANTHROPIC_API_KEY. Optional: ANTHROPIC_QUIZ_MODEL.
import { env } from "node:process";

export type QItem = { emo: string; col: string; q: string; v: string; o: string[]; a: number; av: string };

const KZ_RULES = `Write in correct literary Kazakh (Cyrillic). Use "қандай?" not "қайсы?", "туылған" not "туған", "жер аумағы бойынша" for territory size.`;
const RU_RULES = `Write in correct Russian.`;

export function buildPrompt(lang: "kz" | "ru", n: number, avoid: string[]): string {
  return `You write questions for a fast general-knowledge quiz video (TikTok/Reels).
Write ${n + 2} NEW questions. ${lang === "kz" ? KZ_RULES : RU_RULES}
Requirements for every question:
- ANY topic from the whole world, as varied as possible: space, planets, animals, nature, geography of all continents, world history, inventions, science, the human body, food, sport, music, art, films, languages, records, technology, everyday logic. Each question in the set from a DIFFERENT topic. Kazakhstan-related questions are allowed but rare: at most one in the whole reply, often none. Easy-to-medium difficulty; answerable in 5 seconds.
- Only undisputed, stable facts you are 100% sure about. No facts that change over time (populations, current office holders, records that may have been broken, prices), no trick questions, no ambiguous wording.
- Exactly 3 short options (max 18 characters each), exactly ONE correct, the two wrong ones plausible.
- Question text max ~60 characters; insert "\\n" line breaks so each line is at most ~24 characters.
- Do not repeat or paraphrase any of these previously used questions: ${JSON.stringify(avoid.slice(0, 150))}
Fields per question:
- "emo": ONE emoji about the TOPIC of the question that NEVER shows or hints at the correct answer or any option (e.g. Eiffel Tower → 🗼 is fine for "which city", but for "which country is the homeland of pizza" do not use a flag).
- "col": a soft pastel background hex colour fitting the emoji, like "#dbe7f5".
- "q": the on-screen question with \\n breaks.
- "v": the same question as one line for text-to-speech (numbers written in words in ${lang === "kz" ? "Kazakh" : "Russian"}).
- "o": array of 3 options; "a": index (0-2) of the correct option.
- "av": the correct answer as it should be spoken (numbers and years in words).
- "sure": true only if you are completely certain the answer is correct and the only correct one.
Reply with ONLY a JSON array, no markdown, no comments.`;
}

export function parseItems(text: string, n: number, avoid: string[]): QItem[] {
  const m = String(text || "").match(/\[[\s\S]*\]/);
  if (!m) return [];
  let arr: any[] = [];
  try { arr = JSON.parse(m[0]); } catch { return []; }
  const seen = new Set(avoid.map((s) => s.replace(/\s+/g, " ").trim().toLowerCase()));
  const out: QItem[] = [];
  for (const x of Array.isArray(arr) ? arr : []) {
    if (!x || x.sure === false) continue;
    const o = Array.isArray(x.o) ? x.o.map((s: unknown) => String(s).trim()).filter(Boolean) : [];
    const a = Number(x.a);
    const q = String(x.q || "").replace(/\\n/g, "\n").trim();
    if (o.length !== 3 || !(a >= 0 && a <= 2) || !q || new Set(o.map((s: string) => s.toLowerCase())).size !== 3) continue;
    const key = q.replace(/\s+/g, " ").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      emo: String(x.emo || "❓").slice(0, 8),
      col: /^#[0-9a-f]{6}$/i.test(String(x.col)) ? String(x.col) : "#e3e8f5",
      q: q.slice(0, 120),
      v: String(x.v || q.replace(/\n/g, " ")).slice(0, 200),
      o: o.map((s: string) => s.slice(0, 30)),
      a,
      av: String(x.av || o[a]).slice(0, 120),
    });
    if (out.length >= n) break;
  }
  return out;
}

export async function makeQuiz(input: { lang?: string; n?: number; avoid?: string[] }): Promise<{ ok: true; items: QItem[] } | { ok: false; error: string; status?: number }> {
  const key = (env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return { ok: false, error: "ANTHROPIC_API_KEY not set" };
  const lang = input.lang === "ru" ? "ru" : "kz";
  const n = Math.min(4, Math.max(1, Number(input.n) || 4));
  const avoid = (input.avoid || []).map((s) => String(s).slice(0, 120)).slice(0, 150);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: (env.ANTHROPIC_QUIZ_MODEL || "claude-sonnet-5-5").trim(), max_tokens: 4000, messages: [{ role: "user", content: buildPrompt(lang, n, avoid) }] }),
      signal: AbortSignal.timeout(90_000),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, status: r.status, error: "anthropic_" + r.status + (j?.error?.message ? ": " + String(j.error.message).slice(0, 160) : "") };
    const text = (j.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text || "").join("");
    const items = parseItems(text, n, avoid);
    return items.length >= n ? { ok: true, items } : { ok: false, error: "bad_reply" };
  } catch (e) {
    return { ok: false, error: (e as Error).name === "TimeoutError" ? "timeout" : "request_failed" };
  }
}
