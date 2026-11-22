// Tole webhook verification.
// Signed string: "<webhook-id>.<webhook-timestamp>.<exact raw body>"; header webhook-signature: "v1=<hex HMAC-SHA256>".
// Verify over the exact raw body BEFORE JSON parsing.

export interface WebhookHeaders {
  id: string | null; // webhook-id
  timestamp: string | null; // webhook-timestamp
  signature: string | null; // webhook-signature
}

export type PaymentEventType =
  | "payment.created" | "payment.paid" | "payment.cancelled" | "payment.expired" | "payment.failed"
  | "payment.partially_refunded" | "payment.refunded" | "refund.reserved" | "refund.succeeded"
  | "operation.succeeded" | "operation.rejected" | "operation.outcome_unknown" | "refund.rejected" | "refund.outcome_unknown";

export interface ToleWebhookEvent {
  id: string;
  type: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export type VerifyResult =
  | { ok: true; webhookId: string; timestampSec: number; event: ToleWebhookEvent }
  | { ok: false; reason: "missing_headers" | "bad_timestamp" | "stale_timestamp" | "bad_signature" | "bad_body" };

const enc = new TextEncoder();

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison of two hex strings. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const x = a.toLowerCase(), y = b.toLowerCase();
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

/** webhook-timestamp is documented only as a "Unix timestamp"; accept seconds or milliseconds. */
export function parseWebhookTimestamp(v: string | null): number | null {
  if (!v || !/^\d{9,14}$/.test(v.trim())) return null;
  const n = Number(v.trim());
  return n > 1e12 ? Math.floor(n / 1000) : n;
}

export async function verifyToleWebhook(opts: {
  secret: string;
  headers: WebhookHeaders;
  rawBody: string;
  nowMs?: number;
  toleranceSec?: number; // replay window, default 300s
}): Promise<VerifyResult> {
  const { id, timestamp, signature } = opts.headers;
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing_headers" };
  const ts = parseWebhookTimestamp(timestamp);
  if (ts == null) return { ok: false, reason: "bad_timestamp" };
  const now = Math.floor((opts.nowMs ?? Date.now()) / 1000);
  if (Math.abs(now - ts) > (opts.toleranceSec ?? 300)) return { ok: false, reason: "stale_timestamp" };

  const expected = await hmacHex(opts.secret, `${id}.${timestamp}.${opts.rawBody}`);
  // Accept one or more space/comma separated "v1=<hex>" entries (rotation-friendly); ignore other versions.
  const candidates = signature.split(/[\s,]+/).filter((s) => s.startsWith("v1=")).map((s) => s.slice(3));
  if (!candidates.some((c) => /^[0-9a-fA-F]{64}$/.test(c) && timingSafeEqualHex(c, expected))) return { ok: false, reason: "bad_signature" };

  let event: ToleWebhookEvent;
  try {
    event = JSON.parse(opts.rawBody);
  } catch {
    return { ok: false, reason: "bad_body" };
  }
  if (!event || typeof event.id !== "string" || typeof event.type !== "string" || typeof event.data !== "object" || event.data === null) {
    return { ok: false, reason: "bad_body" };
  }
  return { ok: true, webhookId: id, timestampSec: ts, event };
}

/** Sign helper for tests and local tooling. */
export async function signToleWebhook(secret: string, id: string, timestamp: string, rawBody: string): Promise<string> {
  return "v1=" + (await hmacHex(secret, `${id}.${timestamp}.${rawBody}`));
}
