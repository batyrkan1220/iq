// Reels illustrations via the Anthropic API (Claude draws an SVG picture for a quiz question).
// Key: ANTHROPIC_API_KEY (Render env). Optional: ANTHROPIC_MODEL. The key is never logged or returned.
import { env } from "node:process";

const MODEL_DEFAULT = "claude-sonnet-5-5";

export function illusConfigured(): boolean {
  return !!(env.ANTHROPIC_API_KEY || "").trim();
}

/** Strip anything executable or external from an SVG produced by the model. Returns null if it isn't a usable SVG. */
export function sanitizeSvg(raw: string): string | null {
  const m = String(raw || "").match(/<svg[\s\S]*<\/svg>/i);
  if (!m) return null;
  let s = m[0];
  s = s.replace(/<(script|foreignObject|iframe|object|embed|audio|video|image|use)\b[\s\S]*?(<\/\1>|\/>)/gi, "");
  s = s.replace(/<(script|foreignObject|iframe|object|embed|image|use)\b[^>]*>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/\s(xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "");
  s = s.replace(/url\(\s*['"]?(?!#)[^)]*\)/gi, "none");
  s = s.replace(/@import[^;]*;?/gi, "");
  s = s.replace(/<text\b[\s\S]*?<\/text>/gi, ""); // no letters/digits on the picture (could reveal the answer)
  if (!/^<svg[^>]*xmlns=/i.test(s)) s = s.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  if (!/viewBox=/i.test(s.slice(0, 300))) s = s.replace(/^<svg/i, '<svg viewBox="0 0 600 400"');
  s = s.replace(/^<svg([^>]*?)\s(width|height)="[^"]*"/i, "<svg$1").replace(/^<svg([^>]*?)\s(width|height)="[^"]*"/i, "<svg$1");
  s = s.replace(/^<svg/i, '<svg width="600" height="400"');
  return s.length > 200 && s.length < 200_000 ? s : null;
}

export async function makeIllus(input: { q: string; o: string[]; a: number; lang?: string }): Promise<{ ok: true; svg: string } | { ok: false; error: string; status?: number }> {
  const key = (env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return { ok: false, error: "ANTHROPIC_API_KEY not set" };
  const q = String(input.q || "").replace(/\s+/g, " ").slice(0, 300);
  const opts = (input.o || []).map((x) => String(x).slice(0, 60)).slice(0, 4);
  const correct = opts[input.a] ?? "";
  const prompt = `You draw one illustration for a vertical quiz video (TikTok/Reels, Kazakhstan audience).
Question: "${q}"
Answer options: ${opts.map((x) => `"${x}"`).join(", ")}

MAIN RULE: draw exactly the main object/subject NAMED IN THE QUESTION, large and clearly recognisable, as the central hero of the picture. Do not replace it with something else or a vague symbol.
Examples:
- "In which city is the Eiffel Tower?" → draw the Eiffel Tower itself (recognisable iron lattice tower) on a plain sky background. Do NOT draw any city, skyline, streets, river or other buildings.
- "Where do kangaroos live?" → draw a kangaroo on a neutral background, no map, no continent shape.
- "Which country is the homeland of pizza?" → draw a pizza, no flags, no landmarks.
- "Who painted the Mona Lisa?" → draw an easel, palette and brushes (the painting would show the answer's work), no person.
- "How many legs does a spider have?" / any "how many …" question → draw the subject in a way where the counted parts are NOT countable (e.g. a spider web with a spider partly hidden behind a leaf), or draw a related object instead.
FORBIDDEN (would reveal the answer "${correct}"): anything depicting the answer or any option (${opts.map((x) => `"${x}"`).join(", ")}): their cities, countries, maps, flags, people, landmarks or symbols; text, letters, digits or numbers anywhere; a countable set whose count equals an option.
STYLE: polished modern flat vector illustration with good detail (shading, highlights, a few secondary decorative elements like clouds, sparkles, leaves), friendly bright but soft colours, soft gradients and shadows, the hero object fills about 60–70% of the height, full-bleed light background covering the whole canvas.
Output ONLY one valid SVG: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">…</svg>. No <text>, <image>, <script>, <foreignObject>, external links or CSS imports. Aim for 6–15 KB of SVG.`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: (env.ANTHROPIC_MODEL || MODEL_DEFAULT).trim(), max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(110_000),
    });
    const j = (await r.json().catch(() => ({}))) as { content?: { type: string; text?: string }[]; error?: { message?: string } };
    if (!r.ok) return { ok: false, status: r.status, error: "anthropic_" + r.status + (j.error?.message ? ": " + j.error.message.slice(0, 160) : "") };
    const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text || "").join("");
    const svg = sanitizeSvg(text);
    return svg ? { ok: true, svg } : { ok: false, error: "no_svg_in_reply" };
  } catch (e) {
    return { ok: false, error: (e as Error).name === "TimeoutError" ? "timeout" : "request_failed" };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Call Claude with a model fallback list; retries once on overload/rate limit. Returns text or the last HTTP status. */
async function claudeText(content: unknown, maxTokens: number): Promise<{ text: string; status: number }> {
  const key = (env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return { text: "", status: 0 };
  const models = [...new Set([(env.ANTHROPIC_PROMPT_MODEL || "claude-haiku-5-5").trim(), "claude-sonnet-5-5"])];
  let status = 0;
  for (const model of models) {
    for (let t = 0; t < 2; t++) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content }] }),
          signal: AbortSignal.timeout(40_000),
        });
        status = r.status;
        const j: any = await r.json().catch(() => ({}));
        const text = (j.content || []).map((c: any) => c.text || "").join("").trim();
        if (r.ok && text) return { text, status };
        if (r.status === 429 || r.status === 529 || r.status >= 500) { await sleep(1500 * (t + 1)); continue; }
        break; // 400/404 (e.g. unknown model) → try next model
      } catch { status = -1; }
    }
  }
  return { text: "", status };
}

// ---------- Cloudflare Workers AI · FLUX.1 schnell (free daily allocation) ----------
// Keys: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (Render env). Never logged or returned.
const CF_IMG = "@cf/black-forest-labs/flux-1-schnell";
const CF_TXT = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function fluxConfigured(): boolean {
  return !!((env.CLOUDFLARE_ACCOUNT_ID || "").trim() && (env.CLOUDFLARE_API_TOKEN || "").trim());
}

async function cfRun(model: string, body: unknown, tries = 3): Promise<{ ok: boolean; status: number; json: any }> {
  for (let t = 0; ; t++) {
    const r = await cfRun1(model, body);
    if (r.status !== 429 || t >= tries - 1) return r;
    await sleep(2500 * (t + 1));
  }
}
async function cfRun1(model: string, body: unknown): Promise<{ ok: boolean; status: number; json: any }> {
  const acc = (env.CLOUDFLARE_ACCOUNT_ID || "").trim(), tok = (env.CLOUDFLARE_API_TOKEN || "").trim();
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(acc)}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok && json?.success !== false, status: r.status, json };
}

/** Turn the (Kazakh/Russian) quiz question into a short English FLUX prompt that shows the subject, never the answer. */
export function promptRules(q: string, opts: string[], correct: string, strict = false): string {
  return `You write image prompts for FLUX for a quiz video. Question: "${q}". Answer options: ${opts.map((x) => `"${x}"`).join(", ")}. Correct answer: "${correct}".
THE PICTURE MUST NEVER REVEAL OR HINT AT THE ANSWER. A viewer looking at the picture must NOT be able to guess which option is correct.
How to choose what to draw:
1) If the question itself names an object that is NOT one of the options, draw that object (e.g. "In which city is the Eiffel Tower?" -> the Eiffel Tower alone against a plain sky, no city; "Who painted the Mona Lisa?" -> an empty easel with brushes).
2) If the thing being asked about IS the answer (e.g. "Which animal has three hearts?", "Which metal is liquid at room temperature?", "Which planet has the longest day?"), draw only the CLUE from the question or a neutral scene that fits ALL options equally: e.g. three glowing cartoon hearts; a laboratory flask with a thermometer; a starry sky with a telescope. Never draw any of the options or anything typical of only one of them (no octopus, no sea, no silver droplets, no specific planet).
3) "How many…" questions: draw the subject so nothing countable equals an option.
Forbidden everywhere: any option (${opts.map((x) => `"${x}"`).join(", ")}) or its typical habitat, shape, colour, symbol, landmark, flag, map, person; text, letters, digits.${strict ? "\nA previous picture REVEALED the answer. Be much more abstract and neutral this time: draw only a generic symbolic scene of the question's general category." : ""}
Reply with ONE English prompt (max 40 words) only, no quotes, no explanations.`;
}

/** Ask Claude (vision) whether a generated picture shows or hints at any option. Returns true if it leaks. */
export async function leaksAnswer(b64: string, q: string, opts: string[]): Promise<boolean> {
  const c = await claudeText([
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
    { type: "text", text: `Quiz question: "${q}". Options: ${opts.map((x) => `"${x}"`).join(", ")}.\nDoes this picture show, depict or clearly hint at ANY of the options (the thing itself, its typical look, habitat, symbol, flag, landmark, or readable text/number)? Answer only YES or NO.` },
  ], 5);
  return c.text.toUpperCase().startsWith("YES");
}

async function writeFluxPrompt(q: string, opts: string[], correct: string, strict = false): Promise<string> {
  const ask = promptRules(q, opts, correct, strict);
  const c = await claudeText(ask, 200);
  if (c.text) return c.text;
  const r = await cfRun(CF_TXT, { messages: [{ role: "user", content: ask }], max_tokens: 150 });
  const t = String(r.json?.result?.response || "").trim();
  if (!t) throw new Error(`prompt_claude${c.status}_cf${r.status}`);
  return t;
}

/** Neutral picture subjects for the offline question bank's categories (picked by the question's emoji).
 *  None of them can reveal an answer, and they need no LLM call (works when Anthropic credits / CF text quota run out). */
const TOPIC: Record<string, string[]> = {
  "🤯": ["Colorful glossy 3D building blocks of different heights lined up in a row on a desk", "Playful stack of colorful wooden toy blocks and marbles, puzzle mood"],
  "➕": ["Two groups of shiny colorful marbles being poured together into one glass bowl", "Colorful toy blocks being stacked together into a tall tower"],
  "➖": ["A tower of colorful toy blocks with a few blocks flying away from the top", "A glass jar of colorful candies with some candies rolling out"],
  "🧩": ["Colorful jigsaw puzzle pieces floating in the air, one empty slot glowing", "A winding path of colorful stepping stones leading into the distance"],
  "🧮": ["A wooden abacus with bright colorful beads on a desk", "Neat grid of colorful candies arranged in rows on a tray"],
  "🎲": ["Colorful dice tumbling through the air with sparkles", "A board game table with colorful dice and game pieces"],
  "⚖️": ["A shiny brass balance scale with colorful weights", "A balance scale holding colorful fruit on both sides"],
  "💯": ["A big round pie cut into colorful slices on a plate", "A colorful progress bar made of glowing glass segments"],
  "🔢": ["Glowing colorful crystal cubes floating in a soft space", "A mysterious treasure chest glowing with colorful light"],
  "🏙️": ["A generic modern city skyline at sunset with glass towers, no famous landmarks", "A cozy evening city street with lights and trams, generic city"],
  "🌍": ["A vintage brass compass lying on a rolled-up old paper map tied with string", "A hot air balloon flying high above fluffy clouds"],
  "📏": ["A yellow measuring tape and a wooden ruler on a craft table", "Colorful rulers and pencils neatly arranged on a desk"],
  "⏱️": ["A shiny silver stopwatch next to a glass hourglass with flowing sand", "A cute alarm clock and a calendar on a desk"],
  "🧪": ["Laboratory glass flasks with bright colorful glowing liquids", "A science lab table with test tubes and bubbling beakers"],
  "👥": ["Three cute cartoon kids standing side by side on a stage with a spotlight, seen from behind", "Three cartoon runners on a race track seen from far away"],
  "📅": ["A blank colorful desk calendar with a cup of tea and a plant", "A cozy desk with a blank planner notebook and colorful pencils"],
  "🗓️": ["One tree whose crown is split into spring, summer, autumn and winter", "Four seasons landscape panorama from snowy winter to golden autumn"],
  "🔗": ["Two glowing puzzle pieces clicking together with sparkles", "Two colorful chain links connecting, glowing softly"],
  "🔍": ["A big magnifying glass over a row of colorful wrapped gift boxes, one glowing", "A curious cartoon detective magnifying glass over colorful shapes"],
  "❓": ["A glowing puzzle box with a hidden missing piece, sparkles", "A treasure map path with a glowing mystery chest at the end"],
  "🕰️": ["A vintage wall clock on a pastel wall with soft light", "A cute alarm clock on a nightstand next to a lamp"],
  "🕵️": ["A cute cartoon detective with a magnifying glass, mysterious friendly mood", "A detective desk with a lamp, magnifying glass and notebook"],
  "💰": ["A cute shop counter with a cash register and a few coins", "A colorful piggy bank with coins around it"],
  "🎂": ["A colorful birthday cake with lit candles and confetti", "A family photo frame wall with balloons, cozy living room"],
};
const GENERIC = [
  "A big friendly glowing question mark surrounded by soft sparkles and floating abstract shapes",
  "A glowing light bulb idea floating above an open book with sparkles",
  "A cute cartoon brain with a lightbulb, thinking, surrounded by sparkles",
  "A magnifying glass over a stack of colorful books with sparkles",
];
export function topicSubject(emo?: string): { key: string; subjects: string[] } | null {
  const e = String(emo || "").trim();
  return TOPIC[e] ? { key: [...e].map((c) => c.codePointAt(0)!.toString(16)).join("-"), subjects: TOPIC[e] } : null;
}

// ---- image cache in Supabase Storage (bucket "reels", folder illus-cache/<key>/): one FLUX picture is reused many times ----
const CACHE_MAX = 6;
function sbStore(): { url: string; h: Record<string, string> } | null {
  const url = (env.SUPABASE_URL || "https://dlhejkmuyyqvjzjxbwbg.supabase.co").trim().replace(/\/+$/, "");
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || "").trim();
  if (!key) return null;
  const h: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) h.Authorization = `Bearer ${key}`;
  return { url, h };
}
async function cacheList(key: string): Promise<string[]> {
  const s = sbStore(); if (!s) return [];
  try {
    const r = await fetch(`${s.url}/storage/v1/object/list/reels`, { method: "POST", headers: { ...s.h, "Content-Type": "application/json" }, body: JSON.stringify({ prefix: `illus-cache/${key}/`, limit: 50 }), signal: AbortSignal.timeout(8000) });
    const j = await r.json().catch(() => []);
    return Array.isArray(j) ? j.map((x: any) => String(x.name || "")).filter((n: string) => n.endsWith(".jpg")) : [];
  } catch { return []; }
}
async function cacheGet(key: string, name: string): Promise<string | null> {
  const s = sbStore(); if (!s) return null;
  try {
    const r = await fetch(`${s.url}/storage/v1/object/reels/illus-cache/${key}/${name}`, { headers: s.h, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    return "data:image/jpeg;base64," + Buffer.from(await r.arrayBuffer()).toString("base64");
  } catch { return null; }
}
async function cachePut(key: string, b64: string): Promise<void> {
  const s = sbStore(); if (!s) return;
  try {
    await fetch(`${s.url}/storage/v1/object/reels/illus-cache/${key}/${Date.now()}.jpg`, { method: "POST", headers: { ...s.h, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: Buffer.from(b64, "base64"), signal: AbortSignal.timeout(15000) });
  } catch { /* cache is best-effort */ }
}

/** Picture for a bank question by its category emoji: cached FLUX picture, or a new one (stored for reuse). No LLM needed. */
export async function topicImage(emo?: string): Promise<{ ok: true; src: string; prompt: string } | { ok: false; error: string }> {
  const t = topicSubject(emo) || { key: "generic", subjects: GENERIC };
  const have = await cacheList(t.key);
  const useCache = have.length >= CACHE_MAX || (have.length > 0 && Math.random() < 0.5);
  if (useCache) {
    const src = await cacheGet(t.key, have[Math.floor(Math.random() * have.length)]);
    if (src) return { ok: true, src, prompt: "cache:" + t.key };
  }
  if (fluxConfigured()) {
    const subject = t.subjects[Math.floor(Math.random() * t.subjects.length)];
    const r = await slot(() => cfRun(CF_IMG, { prompt: fluxPrompt(subject), steps: 8 }));
    const b64 = r.json?.result?.image || r.json?.image;
    if (r.ok && b64) { await cachePut(t.key, b64); return { ok: true, src: "data:image/jpeg;base64," + b64, prompt: subject }; }
    if (have.length) { const src = await cacheGet(t.key, have[Math.floor(Math.random() * have.length)]); if (src) return { ok: true, src, prompt: "cache:" + t.key }; }
    return { ok: false, error: "cloudflare_" + r.status + ": " + String(r.json?.errors?.[0]?.message || "").slice(0, 120) };
  }
  return { ok: false, error: "no_cache_no_flux" };
}

export function fluxPrompt(subject: string): string {
  const s = subject.replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 400);
  return `${s}. Bright friendly 3D cartoon illustration, soft studio lighting, clean pastel background, single centered subject, high detail, vibrant colors, landscape composition. Absolutely no text, no letters, no numbers, no words, no captions, no watermark, no logos, no flags.`;
}

let ACTIVE = 0; const WAIT: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (ACTIVE >= 2) await new Promise<void>((r) => WAIT.push(r));
  ACTIVE++;
  try { return await fn(); } finally { ACTIVE--; WAIT.shift()?.(); }
}
export function makeFlux(input: { q: string; o: string[]; a: number }) { return slot(() => makeFlux1(input)); }
async function makeFlux1(input: { q: string; o: string[]; a: number }): Promise<{ ok: true; src: string; prompt: string } | { ok: false; error: string; status?: number }> {
  if (!fluxConfigured()) return { ok: false, error: "CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not set" };
  const q = String(input.q || "").replace(/\s+/g, " ").slice(0, 300);
  const opts = (input.o || []).map((x) => String(x).slice(0, 60)).slice(0, 4);
  try {
    let lastErr = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      // attempts 0-1: subject prompts (second one stricter); attempt 2: fully neutral fallback picture
      const subject = attempt < 2 ? await writeFluxPrompt(q, opts, opts[input.a] ?? "", attempt === 1)
        : "A big friendly glowing question mark surrounded by soft sparkles and floating abstract shapes";
      const prompt = fluxPrompt(subject);
      const r = await cfRun(CF_IMG, { prompt, steps: 8 });
      const b64 = r.json?.result?.image || r.json?.image;
      if (!r.ok || !b64) {
        const msg = String(r.json?.errors?.[0]?.message || "").slice(0, 160);
        lastErr = "cloudflare_" + r.status + (msg ? ": " + msg : "");
        if (r.status === 429 || r.status === 401 || r.status === 403) break;
        continue;
      }
      if (attempt < 2 && await leaksAnswer(b64, q, opts)) { lastErr = "leak"; continue; }
      return { ok: true, src: "data:image/jpeg;base64," + b64, prompt: subject + (attempt ? ` (попытка ${attempt + 1})` : "") };
    }
    return { ok: false, error: lastErr === "leak" ? "картинка подсказывала ответ" : lastErr || "no_image" };
  } catch (e) {
    return { ok: false, error: (e as Error).name === "TimeoutError" ? "timeout" : String((e as Error).message || "request_failed").slice(0, 80) };
  }
}
