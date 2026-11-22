// Structured, redacted logging for the Tole integration.
// Never pass API keys, webhook secrets, phone numbers, raw provider payloads,
// QR tokens or payment URLs to a logger — this module also strips them defensively.

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;
export interface Logger {
  log(level: LogLevel, msg: string, fields?: LogFields): void;
}

const SENSITIVE_KEY = /(api[-_]?key|secret|token|password|authorization|signature|phone|url|qr|payload|body|raw)/i;
const SENSITIVE_VALUE = [
  /tole_sk_[A-Za-z0-9_]+/g, // Tole API keys
  /whsec_[A-Za-z0-9_-]+/g, // webhook secrets
  /\+?7\d{10}/g, // KZ phone numbers
  /https?:\/\/\S+/g, // any URL (payment / QR links)
];

export function redactString(s: string): string {
  let out = s;
  for (const re of SENSITIVE_VALUE) out = out.replace(re, "[redacted]");
  return out;
}

export function redact(v: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth]";
  if (v == null || typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") return redactString(v).slice(0, 300);
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => redact(x, depth + 1));
  if (typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      o[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : redact(val, depth + 1);
    }
    return o;
  }
  return String(v);
}

export function consoleLogger(component = "tole"): Logger {
  return {
    log(level, msg, fields) {
      const line = JSON.stringify({ ts: new Date().toISOString(), level, component, msg: redactString(msg), ...(redact(fields || {}) as LogFields) });
      if (level === "error") console.error(line);
      else if (level === "warn") console.warn(line);
      else console.log(line);
    },
  };
}

export const silentLogger: Logger = { log() {} };
