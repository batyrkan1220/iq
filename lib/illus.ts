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

// ---------- Cloudflare Workers AI · FLUX.1 schnell (free daily allocation) ----------
// Keys: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (Render env). Never logged or returned.
const CF_IMG = "@cf/black-forest-labs/flux-1-schnell";
const CF_TXT = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function fluxConfigured(): boolean {
  return !!((env.CLOUDFLARE_ACCOUNT_ID || "").trim() && (env.CLOUDFLARE_API_TOKEN || "").trim());
}

async function cfRun(model: string, body: unknown): Promise<{ ok: boolean; status: number; json: any }> {
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
  const key = (env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return false;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: (env.ANTHROPIC_PROMPT_MODEL || "claude-haiku-5-5").trim(), max_tokens: 5,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
          { type: "text", text: `Quiz question: "${q}". Options: ${opts.map((x) => `"${x}"`).join(", ")}.\nDoes this picture show, depict or clearly hint at ANY of the options (the thing itself, its typical look, habitat, symbol, flag, landmark, or readable text/number)? Answer only YES or NO.` },
        ] }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const j: any = await r.json().catch(() => ({}));
    const t = (j.content || []).map((c: any) => c.text || "").join("").trim().toUpperCase();
    return r.ok && t.startsWith("YES");
  } catch { return false; }
}

async function writeFluxPrompt(q: string, opts: string[], correct: string, strict = false): Promise<string> {
  const ask = promptRules(q, opts, correct, strict);
  const key = (env.ANTHROPIC_API_KEY || "").trim();
  if (key) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: (env.ANTHROPIC_PROMPT_MODEL || "claude-haiku-5-5").trim(), max_tokens: 200, messages: [{ role: "user", content: ask }] }),
        signal: AbortSignal.timeout(30_000),
      });
      const j: any = await r.json().catch(() => ({}));
      const t = (j.content || []).map((c: any) => c.text || "").join("").trim();
      if (r.ok && t) return t;
    } catch { /* fall through to Cloudflare text model */ }
  }
  const r = await cfRun(CF_TXT, { messages: [{ role: "user", content: ask }], max_tokens: 150 });
  const t = String(r.json?.result?.response || "").trim();
  if (!t) throw new Error("prompt_" + r.status);
  return t;
}

export function fluxPrompt(subject: string): string {
  const s = subject.replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 400);
  return `${s}. Bright friendly 3D cartoon illustration, soft studio lighting, clean pastel background, single centered subject, high detail, vibrant colors, landscape composition. Absolutely no text, no letters, no numbers, no words, no captions, no watermark, no logos, no flags.`;
}

export async function makeFlux(input: { q: string; o: string[]; a: number }): Promise<{ ok: true; src: string; prompt: string } | { ok: false; error: string; status?: number }> {
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
