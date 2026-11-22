import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRetryAfter, ToleClient, ToleError } from "../../lib/tole/client.ts";
import { CMD, CONN, intent, jsonRes, makeClient, PI, qrCreated, TEST_KEY } from "./helpers.ts";

test("createQr success: 201 completed, documented headers, sandbox path, stable idempotency key", async () => {
  const { client, calls } = makeClient([() => jsonRes(201, qrCreated())]);
  const out = await client.createQr({ amount: 1990 }, "iqtest-qr-order-1");
  assert.equal(out.state, "completed");
  if (out.state !== "completed") return;
  assert.equal(out.data.id, PI);
  assert.equal(out.commandId, CMD);
  const c = calls[0];
  assert.equal(c.method, "POST");
  assert.equal(c.url, "https://api.tolepay.kz/v1/sandbox/qr");
  assert.equal(c.headers.Authorization, `Bearer ${TEST_KEY}`);
  assert.equal(c.headers["Content-Type"], "application/json");
  assert.equal(c.headers["X-Tole-Connection-Id"], CONN);
  assert.equal(c.headers["Idempotency-Key"], "iqtest-qr-order-1");
  assert.deepEqual(c.body, { amount: 1990 });
});

test("live environment uses live routes and omits connection header when not configured", async () => {
  const { client, calls } = makeClient([() => jsonRes(201, qrCreated())], { apiKey: "tole_sk_live_v1_" + "y".repeat(24), environment: "live", connectionId: null });
  await client.createQr({ amount: 10 }, "k1");
  assert.equal(calls[0].url, "https://api.tolepay.kz/v1/qr");
  assert.equal(calls[0].headers["X-Tole-Connection-Id"], undefined);
});

test("config guards: key/env mismatch and missing sandbox connection", () => {
  assert.throws(() => new ToleClient({ apiKey: TEST_KEY, environment: "live" }), (e: ToleError) => e.kind === "config");
  assert.throws(() => new ToleClient({ apiKey: "tole_sk_live_v1_zzz", environment: "sandbox", connectionId: CONN }), (e: ToleError) => e.kind === "config");
  assert.throws(() => new ToleClient({ apiKey: TEST_KEY, environment: "sandbox" }), (e: ToleError) => e.kind === "config");
  assert.throws(() => new ToleClient({ apiKey: "sk_wrong", environment: "sandbox", connectionId: CONN }), (e: ToleError) => e.kind === "config");
});

test("local validation mirrors OpenAPI constraints (no request sent)", async () => {
  const { client, calls } = makeClient([]);
  assert.throws(() => client.createQr({ amount: 0 }, "k"), (e: ToleError) => e.kind === "validation");
  assert.throws(() => client.createQr({ amount: 1.5 }, "k"), (e: ToleError) => e.kind === "validation");
  assert.throws(() => client.createQr({ amount: 10, latitude: 43.2 }, "k"), (e: ToleError) => e.kind === "validation");
  assert.throws(() => client.createInvoice({ phoneNumber: "8701", amount: 10 }, "k"), (e: ToleError) => e.kind === "validation");
  await assert.rejects(() => client.createQr({ amount: 10 }, "bad key with spaces"), (e: ToleError) => e.kind === "config");
  assert.equal(calls.length, 0);
});

test("400 validation error from Tole is surfaced, not retried", async () => {
  const { client, calls } = makeClient([() => jsonRes(400, { statusCode: 400, code: "validation_failed", message: "amount invalid" })]);
  await assert.rejects(() => client.createQr({ amount: 10 }, "k"), (e: ToleError) => e.kind === "validation" && e.code === "validation_failed" && e.status === 400);
  assert.equal(calls.length, 1);
});

test("401 and 403 map to unauthorized/forbidden without retries (mutation and read)", async () => {
  const a = makeClient([() => jsonRes(401, { statusCode: 401, code: "unauthorized", message: "bad key" })]);
  await assert.rejects(() => a.client.createQr({ amount: 10 }, "k"), (e: ToleError) => e.kind === "unauthorized");
  const b = makeClient([() => jsonRes(403, { statusCode: 403, code: "forbidden", message: "scope" })]);
  await assert.rejects(() => b.client.getPaymentIntent("qr", PI), (e: ToleError) => e.kind === "forbidden");
  assert.equal(b.calls.length, 1);
});

test("409 idempotency conflict is surfaced as conflict and never retried", async () => {
  const { client, calls } = makeClient([() => jsonRes(409, { statusCode: 409, code: "idempotency_key_reused", message: "different body" })]);
  await assert.rejects(() => client.createQr({ amount: 10 }, "k"), (e: ToleError) => e.kind === "conflict");
  assert.equal(calls.length, 1);
});

test("429 on a mutation: not retried, Retry-After exposed to caller", async () => {
  const { client, calls, sleeps } = makeClient([() => jsonRes(429, { statusCode: 429, code: "rate_limited", message: "slow down" }, { "Retry-After": "7" })]);
  await assert.rejects(() => client.createQr({ amount: 10 }, "k"), (e: ToleError) => e.kind === "rate_limited" && e.retryAfterMs === 7000);
  assert.equal(calls.length, 1);
  assert.deepEqual(sleeps, []);
});

test("429 on a safe read: retried honoring Retry-After, then succeeds", async () => {
  const { client, calls, sleeps } = makeClient([
    () => jsonRes(429, { statusCode: 429, code: "rate_limited", message: "x" }, { "Retry-After": "2" }),
    () => jsonRes(200, intent("paid")),
  ]);
  const pi = await client.getPaymentIntent("qr", PI);
  assert.equal(pi.status, "paid");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `https://api.tolepay.kz/v1/sandbox/payment-intents/${PI}`);
  assert.deepEqual(sleeps, [2000]);
});

test("5xx on reads uses bounded exponential backoff then gives up", async () => {
  const fail = () => jsonRes(503, { statusCode: 503, code: "unavailable", message: "x" });
  const { client, calls, sleeps } = makeClient([fail, fail, fail, fail], { backoffBaseMs: 100, readRetries: 3 });
  await assert.rejects(() => client.getPaymentIntent("qr", PI), (e: ToleError) => e.kind === "server");
  assert.equal(calls.length, 4);
  assert.deepEqual(sleeps, [100, 200, 400]);
});

test("202 in_progress: returns commandId + Retry-After; waitForCommand polls GET /commands/{id}", async () => {
  const { client, calls, sleeps } = makeClient([
    () => jsonRes(202, { ok: false, kind: "in_progress", commandId: CMD, replayed: true }, { "Retry-After": "1" }),
    () => jsonRes(200, { ok: true, data: { commandId: CMD, status: "processing" } }),
    () => jsonRes(200, { ok: true, data: { commandId: CMD, status: "succeeded", responseStatus: 201, result: qrCreated() } }),
  ]);
  const out = await client.createQr({ amount: 10 }, "k");
  assert.equal(out.state, "in_progress");
  if (out.state !== "in_progress") return;
  assert.equal(out.retryAfterMs, 1000);
  const cmd = await client.waitForCommand(out.commandId, { retryAfterMs: out.retryAfterMs, budgetMs: 10_000 });
  assert.equal(cmd?.status, "succeeded");
  assert.equal(calls[1].url, `https://api.tolepay.kz/v1/sandbox/commands/${CMD}`);
  assert.equal(calls[1].headers["X-Tole-Connection-Id"], undefined, "getCommand takes no connection header");
  assert.deepEqual(sleeps, [1000, 2000]);
  assert.equal(calls.filter((c) => c.method === "POST").length, 1);
});

test("202 in_progress with Location: polls Location only when on the API origin", async () => {
  const { client, calls } = makeClient([
    () => jsonRes(202, { ok: false, kind: "in_progress", commandId: CMD, replayed: true }, { Location: `/v1/sandbox/commands/${CMD}` }),
    () => jsonRes(200, { ok: true, data: { commandId: CMD, status: "succeeded", result: qrCreated() } }),
  ]);
  const out = await client.createQr({ amount: 10 }, "k");
  if (out.state !== "in_progress") throw new Error("expected in_progress");
  assert.equal(out.location, `https://api.tolepay.kz/v1/sandbox/commands/${CMD}`);
  await client.waitForCommand(out.commandId, { location: out.location });
  assert.equal(calls[1].url, `https://api.tolepay.kz/v1/sandbox/commands/${CMD}`);
  const evil = makeClient([() => jsonRes(202, { ok: false, kind: "in_progress", commandId: CMD, replayed: true }, { Location: "https://evil.example/steal" })]);
  const o2 = await evil.client.createQr({ amount: 10 }, "k");
  assert.equal(o2.state === "in_progress" && o2.location, null);
});

test("202 outcome_unknown: reported, mutation is never repeated", async () => {
  const { client, calls } = makeClient([() => jsonRes(202, { ok: false, kind: "outcome_unknown", commandId: CMD, replayed: false })]);
  const out = await client.createQr({ amount: 10 }, "k");
  assert.deepEqual(out, { state: "outcome_unknown", commandId: CMD, reason: "provider" });
  assert.equal(calls.length, 1);
});

test("timeout: mutation returns outcome_unknown(timeout) without retry; reads retry then fail", async () => {
  const m = makeClient(["hang" as never].map(() => () => "hang" as const), { timeoutMs: 20 });
  const out = await m.client.createQr({ amount: 10 }, "k");
  assert.deepEqual(out, { state: "outcome_unknown", commandId: null, reason: "timeout" });
  assert.equal(m.calls.length, 1);
  const r = makeClient([() => "hang", () => "hang"], { timeoutMs: 20, readRetries: 1, backoffBaseMs: 5 });
  await assert.rejects(() => r.client.getPaymentIntent("qr", PI), (e: ToleError) => e.kind === "timeout");
  assert.equal(r.calls.length, 2);
});

test("logs never contain the API key, payment URL or QR token", async () => {
  const { client, lines } = makeClient([() => jsonRes(201, qrCreated())]);
  await client.createQr({ amount: 10 }, "k");
  const dump = JSON.stringify(lines);
  assert.ok(!dump.includes(TEST_KEY));
  assert.ok(!dump.includes("pay.example"));
  assert.ok(!dump.includes("qr.kaspi.kz"));
});

test("parseRetryAfter handles seconds and HTTP-date", () => {
  assert.equal(parseRetryAfter("3"), 3000);
  assert.equal(parseRetryAfter(new Date(10_000).toUTCString(), 4_000), 6000);
  assert.equal(parseRetryAfter(null), null);
  assert.equal(parseRetryAfter("soon"), null);
});
