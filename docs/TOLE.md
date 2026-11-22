# Tole Payments (Kaspi QR) — iqtest.live

One-time payment that unlocks a test result. Flow: **immediate Kaspi QR** (`POST /qr`) — no phone number is collected.
Recurring invoices are **not** used.

## Where things live

| What | Where |
|---|---|
| Tole API key, connection id, webhook secret, DB service key | **Render → iqtest-live → Environment** (server-side only) |
| Price, paywall on/off | **Admin → 💳 Төлемдер → Төлем баптаулары** (`public.app_settings`) |
| Payment records & accounting | Admin → 💳 Төлемдер (`public.payments`) |
| Webhook inbox (ids only, no raw payloads) | `public.tole_webhook_events` |

## Environment variables (Render)

| Name | Required | Example / format |
|---|---|---|
| `TOLE_API_KEY` | yes | `tole_sk_test_v1…` (sandbox) or `tole_sk_live_v1…` (live) |
| `TOLE_ENV` | yes | `sandbox` or `live` — must match the key prefix (checked at startup) |
| `TOLE_CONNECTION_ID` | sandbox: yes · live: optional | UUID of the Kaspi connection, sent as `X-Tole-Connection-Id` |
| `TOLE_WEBHOOK_SECRET` | yes (for webhooks) | `whsec_…` — shown once when the webhook endpoint is created |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase → Project Settings → API keys → secret / service_role |
| `SUPABASE_URL` | no | defaults to `https://dlhejkmuyyqvjzjxbwbg.supabase.co` |

Never put these in the repo, the browser bundle, chat, or logs. The logger redacts keys, secrets, phone numbers and URLs.

## Webhook

Register in the Tole dashboard: `https://iqtest.live/api/tole/webhook`
(until the custom domain is attached in Render: `https://iqtest-live.onrender.com/api/tole/webhook`).

Verification: `webhook-signature: v1=hex(HMAC-SHA256(TOLE_WEBHOOK_SECRET, "<webhook-id>.<webhook-timestamp>.<exact raw body>"))`,
checked before JSON parsing, constant-time compare, ±300 s timestamp window, dedupe on `webhook-id`,
stored before processing; 2xx only after the insert succeeds. Payment events carry no payment-intent id in the
OpenAPI schema, so an event triggers reconciliation of open payments through `GET /payment-intents/qr/{id}`.

## Mutation rules implemented

* Idempotency-Key = `iqtest-qr-<orderId>` (one key per local order, reused on every re-send).
* 200/201 → complete. 202 `in_progress` → honour `Retry-After`, poll `Location` (same origin only) or `GET /commands/{id}`.
* 202 `outcome_unknown` → never re-sent; reconciled from the command, then the payment intent.
* Transport timeout during create → the order stays `creating`; the next explicit user action re-sends the
  *identical* idempotent request (Tole replays the stored result).
* Reads retry with exponential backoff (timeout / network / 429 / 5xx, max 3). Mutations and 4xx are never auto-retried.

## Tests

```bash
npm test            # node --test tests/tole/*.test.ts  (Node ≥ 22.18, no dependencies)
```

## Sandbox smoke test (run on your own machine)

```bash
TOLE_API_KEY=tole_sk_test_v1_xxx TOLE_CONNECTION_ID=<connection-uuid> \
  node scripts/tole-sandbox-smoke.ts 100 --simulate=paid
```
Creates a sandbox QR, reads the payment intent, simulates `paid` (key needs `sandbox:simulate`), reads it again.
Prints only ids and statuses. Exit code 0 = success.

## Go-live checklist

1. Render env: sandbox key + `TOLE_ENV=sandbox` + connection id + webhook secret + service key → run the smoke test, then pay once on the site.
2. Admin: set price, turn the paywall **on**; check "✅ Сайтта төлем қосулы".
3. Swap to the live key and `TOLE_ENV=live`; register the live webhook endpoint and update `TOLE_WEBHOOK_SECRET`.
4. Make one real payment and confirm it appears as **төленді** in Admin → Төлемдер.
