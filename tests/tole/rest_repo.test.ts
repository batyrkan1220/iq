import { test } from "node:test";
import assert from "node:assert/strict";
import { restClient, restPaymentRepo, restSettings } from "../../lib/tole/rest_repo.ts";
import { fakeFetch, jsonRes } from "./helpers.ts";

const KEY = "sb_secret_fake_for_tests";

test("insertOrGet: unique conflict returns the existing row (idempotent order creation)", async () => {
  const ff = fakeFetch([
    () => jsonRes(409, { code: "23505", message: "duplicate key" }),
    () => jsonRes(200, [{ id: 7, order_id: "o1", status: "pending" }]),
  ]);
  const repo = restPaymentRepo(restClient({ url: "https://db.example", serviceKey: KEY, fetchImpl: ff.f }));
  const row = await repo.insertOrGet({ order_id: "o1" } as never);
  assert.equal(row.id, 7);
  assert.equal(ff.calls[0].headers.apikey, KEY);
  assert.equal(ff.calls[0].headers.Authorization, undefined, "non-JWT secret keys go only in apikey");
  assert.match(ff.calls[0].url, /^https:\/\/db\.example\/rest\/v1\/payments\?/);
});

test("insertWebhook: 201 → inserted, 409 → duplicate, 5xx → throws (no 2xx before durable storage)", async () => {
  const ff = fakeFetch([() => new Response(null, { status: 201 }), () => jsonRes(409, { code: "23505" }), () => jsonRes(503, {})]);
  const repo = restPaymentRepo(restClient({ url: "https://db.example", serviceKey: KEY, fetchImpl: ff.f }));
  const e = { webhook_id: "w", event_id: "e", event_type: "payment.paid", environment: null, event_created_at: null, ref: {} };
  assert.equal(await repo.insertWebhook(e), "inserted");
  assert.equal(await repo.insertWebhook(e), "duplicate");
  await assert.rejects(() => repo.insertWebhook(e));
});

test("countRecentForVisit reads Content-Range total", async () => {
  const ff = fakeFetch([() => new Response("[]", { status: 206, headers: { "content-range": "0-0/5" } })]);
  const repo = restPaymentRepo(restClient({ url: "https://db.example", serviceKey: KEY, fetchImpl: ff.f }));
  assert.equal(await repo.countRecentForVisit("v", "2026-01-01T00:00:00Z"), 5);
});

test("settings: admin price/paywall parsed and validated; invalid price → null", async () => {
  const ff = fakeFetch([
    () => jsonRes(200, [{ key: "price_kzt", value: 2490 }, { key: "paywall_enabled", value: true }]),
    () => jsonRes(200, [{ key: "price_kzt", value: "abc" }]),
  ]);
  const call = restClient({ url: "https://db.example", serviceKey: KEY, fetchImpl: ff.f });
  assert.deepEqual(await restSettings(call, 0)(), { priceKzt: 2490, paywallEnabled: true });
  assert.deepEqual(await restSettings(call, 0)(), { priceKzt: null, paywallEnabled: false });
});
