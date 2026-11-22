import { test } from "node:test";
import assert from "node:assert/strict";
import { idempotencyKeyFor, PaymentService } from "../../lib/tole/payments.ts";
import { CMD, intent, jsonRes, makeClient, memoryRepo, PI, qrCreated } from "./helpers.ts";

const ORDER = "0b7a3c1e-9f2d-4a55-8e61-2c3d4e5f6a7b";
const VISIT = "5f0c2b8e-1a2b-4c3d-9e8f-001122334455";

function svcWith(responders: Parameters<typeof makeClient>[0], t0 = Date.parse("2026-11-22T12:00:00Z")) {
  const m = makeClient(responders);
  const repo = memoryRepo();
  let now = t0;
  const svc = new PaymentService({ client: m.client, repo, logger: { log() {} }, price: async () => 1990, now: () => now, reconcileMinIntervalMs: 3000 });
  return { ...m, repo, svc, tick: (ms: number) => { now += ms; } };
}

test("startQr success persists Tole id + commandId and returns pay link to the client", async () => {
  const s = svcWith([() => jsonRes(201, qrCreated())]);
  const v = await s.svc.startQr(ORDER, VISIT);
  assert.equal(v.status, "pending");
  assert.equal(v.paymentUrl, "https://pay.example/xyz");
  const row = s.repo.rows[0];
  assert.equal(row.tole_id, PI);
  assert.equal(row.tole_command_id, CMD);
  assert.equal(row.idempotency_key, idempotencyKeyFor(ORDER));
  assert.equal(row.amount, 1990, "amount comes from server config, never from the client");
});

test("repeat startQr for the same order does not create a second QR", async () => {
  const s = svcWith([() => jsonRes(201, qrCreated())]);
  await s.svc.startQr(ORDER, VISIT);
  await s.svc.startQr(ORDER, VISIT); // within throttle window → no provider call
  assert.equal(s.calls.filter((c) => c.method === "POST").length, 1);
  assert.equal(s.repo.rows.length, 1);
});

test("transport timeout keeps the row resumable; the re-send reuses the SAME idempotency key", async () => {
  const s = svcWith([() => "hang", () => jsonRes(201, { ...qrCreated(), replayed: true })]);
  const v1 = await s.svc.startQr(ORDER, VISIT);
  assert.equal(v1.status, "creating");
  assert.equal(v1.retryable, true);
  const v2 = await s.svc.startQr(ORDER, VISIT);
  assert.equal(v2.status, "pending");
  const posts = s.calls.filter((c) => c.method === "POST");
  assert.equal(posts.length, 2);
  assert.equal(posts[0].headers["Idempotency-Key"], posts[1].headers["Idempotency-Key"]);
});

test("202 outcome_unknown: no second POST ever; reconciled from the command", async () => {
  const s = svcWith([
    () => jsonRes(202, { ok: false, kind: "outcome_unknown", commandId: CMD, replayed: false }),
    () => jsonRes(200, { ok: true, data: { commandId: CMD, status: "processing" } }), // immediate check: not terminal
    () => jsonRes(200, { ok: true, data: { commandId: CMD, status: "succeeded", responseStatus: 201, result: qrCreated() } }),
    () => jsonRes(200, intent("pending")),
  ]);
  const v1 = await s.svc.startQr(ORDER, VISIT);
  assert.equal(v1.status, "outcome_unknown");
  s.tick(5000);
  const v2 = await s.svc.startQr(ORDER, VISIT); // user clicks again → read-only reconciliation
  assert.equal(v2.status, "pending");
  assert.equal(s.calls.filter((c) => c.method === "POST").length, 1);
  assert.equal(s.repo.rows[0].tole_id, PI);
});

test("202 in_progress resolves within the budget via command polling", async () => {
  const s = svcWith([
    () => jsonRes(202, { ok: false, kind: "in_progress", commandId: CMD, replayed: true }, { "Retry-After": "1" }),
    () => jsonRes(200, { ok: true, data: { commandId: CMD, status: "succeeded", result: qrCreated() } }),
  ]);
  const v = await s.svc.startQr(ORDER, VISIT);
  assert.equal(v.status, "pending");
  assert.deepEqual(s.sleeps, [1000]);
});

test("validation rejection marks the order rejected (no endless re-sends)", async () => {
  const s = svcWith([() => jsonRes(400, { statusCode: 400, code: "validation_failed", message: "x" })]);
  const v = await s.svc.startQr(ORDER, VISIT);
  assert.equal(v.status, "rejected");
  const again = await s.svc.startQr(ORDER, VISIT);
  assert.equal(again.status, "rejected");
  assert.equal(s.calls.length, 1);
});

test("status polling reconciles to paid via GET payment intent and hides the pay link afterwards", async () => {
  const s = svcWith([() => jsonRes(201, qrCreated()), () => jsonRes(200, intent("paid"))]);
  await s.svc.startQr(ORDER, VISIT);
  s.tick(4000);
  const v = await s.svc.status(ORDER);
  assert.equal(v?.paid, true);
  assert.equal(v?.paymentUrl, null);
  assert.equal(s.repo.rows[0].paid_at, "2026-11-22T12:01:00Z");
});

test("per-visit rate limit", async () => {
  const s = svcWith([]);
  for (let i = 0; i < 6; i++) await s.repo.insertOrGet({ ...({} as never), order_id: `o${i}`, visit_id: VISIT, status: "rejected" } as never);
  await assert.rejects(() => s.svc.startQr(ORDER, VISIT), (e: { kind: string }) => e.kind === "rate_limited");
});

test("price comes from the admin-managed setting at order time; unset price blocks payment creation", async () => {
  const m = makeClient([() => jsonRes(201, qrCreated())]);
  const repo = memoryRepo();
  let price = 0;
  const svc = new PaymentService({ client: m.client, repo, logger: { log() {} }, price: async () => price });
  await assert.rejects(() => svc.startQr(ORDER, VISIT), (e: { kind: string }) => e.kind === "config");
  assert.equal(m.calls.length, 0);
  price = 2490;
  await svc.startQr("1b7a3c1e-9f2d-4a55-8e61-2c3d4e5f6a7b", VISIT);
  assert.deepEqual(m.calls[0].body, { amount: 2490 });
});

test("invoice flow: phone normalised, invoice idempotency key, phone stored in payments.phone for the client list, never logged", async () => {
  const lines: unknown[] = [];
  const m = makeClient([() => jsonRes(201, { ok: true, data: { id: PI, kind: "invoice", status: "created", amount: 1990, clientPhoneLast4: "4567" }, commandId: CMD })]);
  const repo = memoryRepo();
  const svc = new PaymentService({ client: m.client, repo, logger: { log: (...a: unknown[]) => lines.push(a) }, price: async () => 1990 });
  const v = await svc.startInvoice(ORDER, VISIT, "8 (701) 123-45-67");
  assert.equal(v.status, "pending");
  assert.equal(m.calls[0].url, "https://api.tolepay.kz/v1/sandbox/invoices");
  assert.equal((m.calls[0].body as { phoneNumber: string }).phoneNumber, "77011234567");
  assert.equal(m.calls[0].headers["Idempotency-Key"], `iqtest-inv-${ORDER}`);
  const row = repo.rows[0] as unknown as Record<string, unknown>;
  assert.equal(row.kind, "invoice");
  assert.equal(row.note, "***4567");
  assert.equal(row.phone, "77011234567");
  assert.ok(!JSON.stringify(lines).includes("7011234567"), "phone is not logged");
});

test("invoice flow: invalid phone is rejected before any provider call", async () => {
  const m = makeClient([]);
  const svc = new PaymentService({ client: m.client, repo: memoryRepo(), logger: { log() {} }, price: async () => 1990 });
  await assert.rejects(() => svc.startInvoice(ORDER, VISIT, "12345"), (e: { code: string }) => e.code === "bad_phone");
  assert.equal(m.calls.length, 0);
});
