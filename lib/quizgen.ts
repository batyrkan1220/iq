// Reels quiz questions written by Claude (Anthropic API). Key: ANTHROPIC_API_KEY. Optional: ANTHROPIC_QUIZ_MODEL.
import { env } from "node:process";

export type QItem = { emo: string; col: string; q: string; v: string; o: string[]; a: number; av: string };

const KZ_RULES = `Write in correct literary Kazakh (Cyrillic). Use "қандай?" not "қайсы?", "туылған" not "туған", "жер аумағы бойынша" for territory size.`;
const RU_RULES = `Write in correct Russian.`;

export function buildPrompt(lang: "kz" | "ru", n: number, avoid: string[]): string {
  return `You write questions for a fast general-knowledge quiz video (TikTok/Reels).
Write ${n + 2} NEW questions. ${lang === "kz" ? KZ_RULES : RU_RULES}
Requirements for every question:
- ANY topic from the whole world, as varied as possible: space, planets, animals, nature, geography of all continents, world history, inventions, science, the human body, food, sport, music, art, films, languages, records, technology, everyday logic. Each question in the set from a DIFFERENT topic. Kazakhstan-related questions are allowed but rare: at most one in the whole reply, often none.
- DIFFICULTY: medium-to-hard and genuinely interesting — NOT school-basic trivia (avoid things like "how many legs does a spider have", "what is H2O", "which planet is red", "how many days in a week"). Prefer surprising "wow, I didn't know that" facts, counter-intuitive answers and questions where the popular guess is wrong, but still answerable by an educated adult in 5 seconds and still undisputed.
  Good examples of the level: "Which animal has three hearts?" (octopus / squid / starfish), "Which country has the most time zones?" (France / Russia / USA), "Which metal is liquid at room temperature?" (mercury / gallium / sodium), "What colour is a polar bear's skin?" (black / white / pink), "Which planet has the longest day?" (Venus / Mercury / Jupiter).
- CLARITY FIRST: every question must be concrete, unambiguous and self-contained, understandable to a Kazakh/Russian-speaking viewer with no extra context. Name the context explicitly (e.g. "Англия мен Франция арасындағы Жүз жылдық соғыс неше жыл созылды?" not "Жүз жылдық соғыс шын мәнінде неше жыл созылды?"). No trick wording or riddles: never use "шын мәнінде / на самом деле / actually / really", no double negatives, no "approximately" unless the options are clearly far apart. The question must have exactly one defensible answer that does not depend on interpretation.
- Prefer topics people have at least heard of; avoid obscure European/US history, sports trivia and pop culture that Central Asian viewers would not recognise.
- The two wrong options must be tempting (the "obvious" guess should often be wrong), never silly.
- Mix question styles: "which…", "how many…", "what is the only…", "which is bigger/older/longer…", "which country…", "what was invented first…".
- Only undisputed, stable facts you are 100% sure about. No facts that change over time (populations, current office holders, records that may have been broken, prices), no trick questions, no ambiguous wording.
- Exactly 3 short options (max 18 characters each), exactly ONE correct, the two wrong ones plausible.
- Question text max ~60 characters; mark line breaks with the two characters \\n (backslash + n, never a real line break) so each line is at most ~24 characters.
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

/** Pull a JSON array out of a model reply: strips code fences and repairs raw line breaks inside strings. */
export function extractArray(text: string): any[] | null {
  const t = String(text || "").replace(/```(?:json)?/gi, "");
  const a = t.indexOf("["), z = t.lastIndexOf("]");
  if (a < 0 || z <= a) return null;
  const raw = t.slice(a, z + 1);
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : null; } catch { /* repair below */ }
  let out = "", inStr = false, esc = false;
  for (const ch of raw) {
    if (inStr) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = false; out += ch; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r" || ch === "\t") { out += " "; continue; }
      out += ch;
    } else { if (ch === '"') inStr = true; out += ch; }
  }
  try { const v = JSON.parse(out.replace(/,\s*([\]}])/g, "$1")); return Array.isArray(v) ? v : null; } catch { return null; }
}

export function parseItems(text: string, n: number, avoid: string[]): QItem[] {
  const arr = extractArray(text) || [];
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
    const got: QItem[] = [];
    let why = "";
    for (let attempt = 0; attempt < 3 && got.length < n; attempt++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: (env.ANTHROPIC_QUIZ_MODEL || "claude-sonnet-5-5").trim(), max_tokens: 6000, messages: [{ role: "user", content: buildPrompt(lang, n - got.length, [...avoid, ...got.map((x) => x.q.replace(/\n/g, " "))]) }] }),
        signal: AbortSignal.timeout(90_000),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, status: r.status, error: "anthropic_" + r.status + (j?.error?.message ? ": " + String(j.error.message).slice(0, 160) : "") };
      const text = (j.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text || "").join("");
      const arr = extractArray(text);
      const items = parseItems(text, n - got.length, [...avoid, ...got.map((x) => x.q)]);
      if (!items.length) why = (arr ? `filtered_${arr.length}` : "no_json") + `_${j.stop_reason || "?"}`;
      got.push(...items);
    }
    return got.length >= n ? { ok: true, items: got.slice(0, n) } : { ok: false, error: "bad_reply:" + why };
  } catch (e) {
    return { ok: false, error: (e as Error).name === "TimeoutError" ? "timeout" : "request_failed" };
  }
}
