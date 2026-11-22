import { test } from "node:test";
import assert from "node:assert/strict";
import { PaymentService } from "../../lib/tole/payments.ts";
import { parseWebhookTimestamp, signToleWebhook, verifyToleWebhook } from "../../lib/tole/webhook.ts";
import { handleToleWebhook } from "../../lib/tole/webhook_handler.ts";
import { intent, jsonRes, makeClient, memoryRepo, qrCreated } from "./helpers.ts";

const SECRET = "whsec_" + "t".repeat(43); // fake test secret
const WID = "9d1c6a4e-7b2f-4e3a-a1b2-c3d4e5f60718";
const NOW = 1_795_000_000_000;
const TS = String(Math.floor(NOW / 1000));
const body = JSON.stringify({ id: "e1111111-2222-4333-8444-555555555555", type: "payment.paid", createdAt: "2026-11-22T12:01:00Z", data: { environment: "sandbox" } });

test("valid signature over the exact raw body is accepted", async () => {
  const sig = await signToleWebhook(SECRET, WID, TS, body);
  assert.match(sig, /^v1=[0-9a-f]{64}$/);
  const v = await verifyToleWebhook({ secret: SECRET, headers: { id: WID, timestamp: TS, signature: sig }, rawBody: body, nowMs: NOW });
  assert.equal(v.ok, true);
});

test("invalid signature, modified body, missing headers and stale timestamp are rejected", async () => {
  const sig = await signToleWebhook(SECRET, WID, TS, body);
  const bad = (await verifyToleWebhook({ secret: SECRET, headers: { id: WID, timestamp: TS, signature: "v1=" + "0".repeat(64) }, rawBody: body, nowMs: NOW }));
  assert.deepEqual(bad, { ok: false, reason: "bad_signature" });
  const reformatted = JSON.stringify(JSON.parse(body), null, 2); // same JSON, different bytes
  assert.deepEqual(await verifyToleWebhook({ secret: SECRET, headers: { id: WID, timestamp: TS, signature: sig }, rawBody: reformatted, nowMs: NOW }), { ok: false, reason: "bad_signature" });
  assert.deepEqual(await verifyToleWebhook({ secret: "whsec_other", headers: { id: WID, timestamp: TS, signature: sig }, rawBody: body, nowMs: NOW }), { ok: false, reason: "bad_signature" });
  assert.deepEqual(await verifyToleWebhook({ secret: SECRET, headers: { id: null, timestamp: TS, signature: sig }, rawBody: body, nowMs: NOW }), { ok: false, reason: "missing_headers" });
  assert.deepEqual(await verifyToleWebhook({ secret: SECRET, headers: { id: WID, timestamp: TS, signature: sig }, rawBody: body, nowMs: NOW + 10 * 60_000 }), { ok: false, reason: "stale_timestamp" });
  assert.deepEqual(await verifyToleWebhook({ secret: SECRET, headers: { id: WID, timestamp: "abc", signature: sig }, rawBody: body, nowMs: NOW }), { ok: false, reason: "bad_timestamp" });
});

test("timestamp accepted in seconds or milliseconds", () => {
  assert.equal(parseWebhookTimestamp("1795000000"), 1795000000);
  assert.equal(parseWebhookTimestamp("1795000000123"), 1795000000);
});

test("handler: persists before processing, reconciles open payments, dedupes by webhook-id", async () => {
  const m = makeClient([() => jsonRes(201, qrCreated()), () => jsonRes(200, intent("paid"))]);
  const repo = memoryRepo();
  const svc = new PaymentService({ client: m.client, repo, logger: { log() {} }, price: async () => 1990, now: () => NOW });
  await svc.startQr("0b7a3c1e-9f2d-4a55-8e61-2c3d4e5f6a7b", null);
  const sig = await signToleWebhook(SECRET, WID, TS, body);
  const args = { secret: SECRET, headers: { id: WID, timestamp: TS, signature: sig }, rawBody: body, repo, service: svc, logger: { log() {} }, nowMs: NOW };
  const r1 = await handleToleWebhook(args);
  assert.deepEqual(r1, { status: 200, body: "ok" });
  assert.equal(repo.hooks.get(WID)?.status, "processed");
  assert.equal(repo.rows[0].status, "paid");
  const r2 = await handleToleWebhook(args); // duplicate delivery
  assert.deepEqual(r2, { status: 200, body: "duplicate" });
  assert.equal(m.calls.length, 2, "duplicate event triggers no extra provider calls");
});

test("handler: invalid signature → 401 and nothing stored", async () => {
  const repo = memoryRepo();
  const m = makeClient([]);
  const svc = new PaymentService({ client: m.client, repo, logger: { log() {} }, price: async () => 1990 });
  const r = await handleToleWebhook({ secret: SECRET, headers: { id: WID, timestamp: TS, signature: "v1=deadbeef" }, rawBody: body, repo, service: svc, logger: { log() {} }, nowMs: NOW });
  assert.equal(r.status, 401);
  assert.equal(repo.hooks.size, 0);
});

test("handler: storage failure → 5xx so Tole redelivers (no 2xx before durable acceptance)", async () => {
  const repo = memoryRepo();
  repo.insertWebhook = async () => { throw new Error("db down"); };
  const m = makeClient([]);
  const svc = new PaymentService({ client: m.client, repo, logger: { log() {} }, price: async () => 1990 });
  const sig = await signToleWebhook(SECRET, WID, TS, body);
  const r = await handleToleWebhook({ secret: SECRET, headers: { id: WID, timestamp: TS, signature: sig }, rawBody: body, repo, service: svc, logger: { log() {} }, nowMs: NOW });
  assert.equal(r.status, 500);
});
