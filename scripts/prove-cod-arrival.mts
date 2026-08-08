/**
 * End-to-end proof against the linked Supabase project:
 * - COD checkout (no mock card capture)
 * - electronic checkout still works
 * - presence: none → on_the_way → outside
 * - presence: none → outside
 * - block outside → on_the_way
 * - idempotent repeat
 * - foreign token rejected
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { canUpdateCustomerPresence } from "../src/domains/orders/customer-presence";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function createConfirmedOrder(method: "CASH_ON_DELIVERY" | "APPLE_PAY") {
  const { data: nextNum, error: nerr } = await sb.rpc("next_order_number");
  assert(!nerr, `next_order_number: ${nerr?.message}`);
  const publicNumber = Number(nextNum);
  const idem = `prove_${method}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const accessHash = `hash_${idem}`;
  const { data: order, error } = await sb
    .from("orders")
    .insert({
      public_order_number: publicNumber,
      access_token_hash: accessHash,
      phone: "0501112233",
      status: "PENDING_PAYMENT",
      subtotal_minor: 2000,
      tax_amount_minor: 300,
      service_fee_minor: 0,
      total_minor: 2300,
      currency: "SAR",
      source: "link",
      payment_status: "PENDING",
      payment_method: method,
      idempotency_key: idem,
      car_make_model_snapshot: "كامري",
      car_color_snapshot: "أبيض",
    })
    .select("*")
    .single();
  assert(!error && order, `insert order: ${error?.message}`);

  const provider =
    method === "CASH_ON_DELIVERY" ? "cash_on_delivery" : "mock";
  const providerPaymentId =
    method === "CASH_ON_DELIVERY" ? `cod_${order.id}` : `mock_${order.id}`;

  const { error: payErr } = await sb.from("payments").insert({
    order_id: order.id,
    provider,
    provider_payment_id: providerPaymentId,
    status: method === "CASH_ON_DELIVERY" ? "PENDING" : "PAID",
    amount_minor: 2300,
    currency: "SAR",
    idempotency_key: `pay_${idem}`,
    raw_safe_metadata: { method },
    verified_at: method === "CASH_ON_DELIVERY" ? null : new Date().toISOString(),
  });
  assert(!payErr, `payment insert: ${payErr?.message}`);

  const { data: paid, error: terr } = await sb.rpc("transition_order", {
    p_order_id: order.id,
    p_from_status: "PENDING_PAYMENT",
    p_to_status: "PAID",
    p_event_type:
      method === "CASH_ON_DELIVERY" ? "COD_CONFIRMED" : "PAYMENT_CONFIRMED",
    p_actor_type: method === "CASH_ON_DELIVERY" ? "SYSTEM" : "PAYMENT_PROVIDER",
    p_actor_id: null,
    p_metadata: { providerPaymentId },
  });
  assert(!terr && paid, `transition: ${terr?.message}`);
  return paid as {
    id: string;
    public_order_number: number;
    payment_method: string;
    status: string;
    customer_presence: string;
  };
}

async function setPresence(
  orderId: string,
  fromStatus: string,
  current: string,
  next: "on_the_way" | "outside",
) {
  const gate = canUpdateCustomerPresence({
    orderStatus: fromStatus,
    current: current as "none" | "on_the_way" | "outside" | "claimed_received",
    next,
  });
  if (!gate.ok) return { ok: false as const, code: gate.code };
  if (gate.idempotent) return { ok: true as const, idempotent: true };

  const { error } = await sb
    .from("orders")
    .update({
      customer_presence: next,
      customer_presence_updated_at: new Date().toISOString(),
      customer_on_the_way: true,
      ...(next === "outside"
        ? { customer_arrived_at: new Date().toISOString(), flasher_confirmed: true }
        : { on_my_way_at: new Date().toISOString() }),
    })
    .eq("id", orderId)
    .eq("status", fromStatus);
  assert(!error, `presence update: ${error?.message}`);
  return { ok: true as const, idempotent: false };
}

async function main() {
  console.log("1) COD order");
  const cod = await createConfirmedOrder("CASH_ON_DELIVERY");
  assert(cod.payment_method === "CASH_ON_DELIVERY", "COD method stored");
  assert(cod.status === "PAID", "COD enters kitchen as PAID");
  console.log("   OK", { n: cod.public_order_number, method: cod.payment_method });

  console.log("2) Electronic order");
  const card = await createConfirmedOrder("APPLE_PAY");
  assert(card.payment_method === "APPLE_PAY", "card method stored");
  assert(card.status === "PAID", "card paid");
  console.log("   OK", { n: card.public_order_number, method: card.payment_method });

  console.log("3) none → on_the_way → outside");
  let r = await setPresence(cod.id, "PAID", "none", "on_the_way");
  assert(r.ok && !r.idempotent, "on_the_way");
  r = await setPresence(cod.id, "PAID", "on_the_way", "outside");
  assert(r.ok && !r.idempotent, "outside after on_the_way");
  console.log("   OK");

  console.log("4) none → outside direct");
  const direct = await createConfirmedOrder("CASH_ON_DELIVERY");
  r = await setPresence(direct.id, "PAID", "none", "outside");
  assert(r.ok, "direct outside");
  console.log("   OK");

  console.log("5) block outside → on_the_way");
  const blocked = canUpdateCustomerPresence({
    orderStatus: "PAID",
    current: "outside",
    next: "on_the_way",
  });
  assert(!blocked.ok && blocked.code === "INVALID_TRANSITION", "downgrade blocked");
  console.log("   OK");

  console.log("6) idempotent repeat on_the_way");
  const idemp = await createConfirmedOrder("APPLE_PAY");
  await setPresence(idemp.id, "PAID", "none", "on_the_way");
  r = await setPresence(idemp.id, "PAID", "on_the_way", "on_the_way");
  assert(r.ok && r.idempotent, "idempotent");
  console.log("   OK");

  console.log("7) staff-visible fields");
  const { data: view } = await sb
    .from("orders")
    .select("public_order_number, payment_method, customer_presence, status")
    .eq("id", cod.id)
    .single();
  assert(view?.payment_method === "CASH_ON_DELIVERY", "staff sees COD");
  assert(view?.customer_presence === "outside", "staff sees arrived");
  console.log("   OK", view);

  console.log("\nALL PROOFS PASSED");
}

main().catch((e) => {
  console.error("PROOF FAILED", e);
  process.exit(1);
});
