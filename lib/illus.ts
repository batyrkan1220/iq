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

Draw a picture about the TOPIC of the question so the viewer instantly understands what it is about.
STRICT RULES:
- The picture must NOT reveal or hint at the correct answer ("${correct}") and must not show or favour any of the options. Depict only the subject of the question (e.g. for "Who painted the Mona Lisa?" draw an easel with a blank canvas and brushes, NOT the painting or the painter; for "How many legs does a spider have?" draw a web, NOT a spider; for "Which country is the homeland of pizza?" a pizza is fine but no flags or landmarks).
- No text, letters, digits, numbers or flags anywhere. Never draw a countable set whose count equals an option.
- Style: modern flat vector illustration, friendly, bright but soft colours, clean shapes, subtle gradients and soft shadows, one clear central subject, full-bleed light background filling the whole canvas.
- Output ONLY one valid SVG: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">…</svg>. No <text>, <image>, <script>, <foreignObject>, external links or CSS imports. Keep it under 12 KB.`;
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
