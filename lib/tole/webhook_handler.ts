// Runtime-agnostic webhook handling, shared by the Edge Function and the tests.
import type { Logger } from "./log.ts";
import type { PaymentRepo, PaymentService } from "./payments.ts";
import { verifyToleWebhook, type WebhookHeaders } from "./webhook.ts";

const REF_KEYS = ["environment", "source", "recurringInvoiceId", "occurrenceId", "attemptNumber", "paymentIntentId", "commandId", "status", "trigger", "scheduledFor", "failureCode"];

export async function handleToleWebhook(opts: {
  secret: string;
  headers: WebhookHeaders;
  rawBody: string;
  repo: PaymentRepo;
  service: PaymentService;
  logger: Logger;
  nowMs?: number;
  toleranceSec?: number;
  /** If provided, processing is handed to it (e.g. EdgeRuntime.waitUntil) after durable acceptance. */
  defer?: (p: Promise<void>) => void;
}): Promise<{ status: number; body: string }> {
  const v = await verifyToleWebhook({ secret: opts.secret, headers: opts.headers, rawBody: opts.rawBody, nowMs: opts.nowMs, toleranceSec: opts.toleranceSec });
  if (!v.ok) {
    opts.logger.log("warn", "webhook rejected", { reason: v.reason });
    return { status: v.reason === "bad_signature" || v.reason === "missing_headers" ? 401 : 400, body: v.reason };
  }
  const ev = v.event;
  // Persist only identifiers and enums from data — never the raw payload.
  const ref: Record<string, unknown> = {};
  for (const k of REF_KEYS) if (k in ev.data) ref[k] = ev.data[k];

  let inserted: "inserted" | "duplicate";
  try {
    inserted = await opts.repo.insertWebhook({
      webhook_id: v.webhookId, event_id: ev.id, event_type: ev.type,
      environment: typeof ev.data.environment === "string" ? ev.data.environment : null,
      event_created_at: typeof ev.createdAt === "string" ? ev.createdAt : null, ref,
    });
  } catch {
    opts.logger.log("error", "webhook persist failed", { webhookId: v.webhookId, type: ev.type });
    return { status: 500, body: "persist_failed" }; // not accepted → provider retries
  }
  if (inserted === "duplicate") {
    opts.logger.log("info", "webhook duplicate", { webhookId: v.webhookId, type: ev.type });
    return { status: 200, body: "duplicate" };
  }
  opts.logger.log("info", "webhook accepted", { webhookId: v.webhookId, type: ev.type });

  const work = (async () => {
    try {
      await opts.service.processWebhook(ev);
      await opts.repo.markWebhook(v.webhookId, "processed");
    } catch (e) {
      opts.logger.log("error", "webhook processing failed", { webhookId: v.webhookId, type: ev.type, err: (e as Error)?.name });
      await opts.repo.markWebhook(v.webhookId, "failed", "processing_error").catch(() => {});
    }
  })();
  if (opts.defer) opts.defer(work);
  else await work;
  return { status: 200, body: "ok" };
}
