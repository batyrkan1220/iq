// Sandbox smoke test for the immediate QR payment flow. Never prints keys, payment URLs or QR tokens.
// Usage (Node >= 22, run on your own machine; keys come from your shell environment, not from chat):
//   TOLE_API_KEY=tole_sk_test_... TOLE_CONNECTION_ID=<uuid> node scripts/tole-sandbox-smoke.ts [amount] [--simulate=paid|cancelled|expired|failed]
import { ToleClient } from "../lib/tole/client.ts";
import { consoleLogger } from "../lib/tole/log.ts";

const amount = Number(process.argv.find((a) => /^\d+$/.test(a)) || 100);
const simulate = (process.argv.find((a) => a.startsWith("--simulate=")) || "--simulate=paid").split("=")[1] as "paid";
const key = process.env.TOLE_API_KEY || "";
if (!key.startsWith("tole_sk_test_")) { console.error("Set TOLE_API_KEY to a sandbox key (tole_sk_test_…)."); process.exit(2); }

const client = new ToleClient({ apiKey: key, environment: "sandbox", connectionId: process.env.TOLE_CONNECTION_ID, logger: consoleLogger("smoke") });
const idem = `iqtest-smoke-${Date.now()}`; // one stable key per smoke run
const step = (name: string, info: Record<string, unknown>) => console.log(JSON.stringify({ step: name, ...info }));

const out = await client.createQr({ amount }, idem);
let id: string | undefined;
if (out.state === "completed") {
  id = out.data.id;
  step("create", { http: out.httpStatus, id, status: out.data.status, commandId: out.commandId, hasPaymentUrl: !!out.data.paymentUrl, hasQrToken: !!out.data.qrToken });
} else if (out.state === "in_progress") {
  step("create", { state: "in_progress", commandId: out.commandId, retryAfterMs: out.retryAfterMs });
  const cmd = await client.waitForCommand(out.commandId, { retryAfterMs: out.retryAfterMs, location: out.location, budgetMs: 30_000 });
  id = (cmd?.result?.data as { id?: string } | undefined)?.id;
  step("command", { status: cmd?.status ?? "still_pending", id });
} else {
  step("create", { state: "outcome_unknown", commandId: out.commandId, reason: out.reason });
  if (out.commandId) step("command", { status: (await client.getCommand(out.commandId)).status });
  process.exit(1); // never re-send: reconcile manually
}
if (!id) process.exit(1);

step("intent", { status: (await client.getPaymentIntent("qr", id)).status });
const sim = await client.sandboxSimulate(id, simulate);
step("simulate", { requested: simulate, status: sim.status });
const fin = await client.getPaymentIntent("qr", id);
step("final", { status: fin.status, paidAt: fin.paidAt ?? null, environment: fin.environment ?? null });
process.exit(fin.status === simulate ? 0 : 1);
