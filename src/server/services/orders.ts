import { canTransition, eventTypeForTransition } from "@/domains/orders/state-machine";
import { hashToken } from "@/lib/auth/customer-token";
import { log, newRequestId } from "@/lib/logging";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { DomainError } from "./checkout";
import type { OrderStatus } from "@/types/database";

export async function getOrderForCustomer(input: {
  publicOrderNumber: number;
  accessToken: string;
}) {
  const rl = rateLimit(`order_access:${input.publicOrderNumber}`, 60, 60_000);
  if (!rl.ok) throw new DomainError("RATE_LIMITED", "حاول مرة ثانية بعد شوي");

  const supabase = createServiceClient();
  const tokenHash = hashToken(input.accessToken);

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("public_order_number", input.publicOrderNumber)
    .eq("access_token_hash", tokenHash)
    .maybeSingle();

  if (!order) throw new DomainError("ORDER_NOT_FOUND", "ما لقينا الطلب");

  const { data: items } = await supabase
    .from("order_items")
    .select("*, order_item_modifiers(*)")
    .eq("order_id", order.id);

  const { data: events } = await supabase
    .from("order_events")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  return { order, items: items ?? [], events: events ?? [] };
}

export async function markOnTheWay(input: {
  publicOrderNumber: number;
  accessToken: string;
}) {
  const { order } = await getOrderForCustomer(input);
  if (order.customer_on_the_way) {
    return { ok: true as const, idempotent: true };
  }

  const allowed: OrderStatus[] = ["PAID", "ACCEPTED", "PREPARING", "READY"];
  if (!allowed.includes(order.status)) {
    throw new DomainError("INVALID_STATE", "ما نقدر نسجل هالخطوة الحين");
  }

  const supabase = createServiceClient();
  await supabase
    .from("orders")
    .update({
      customer_on_the_way: true,
      on_my_way_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "CUSTOMER_ON_THE_WAY",
    from_status: order.status,
    to_status: order.status,
    actor_type: "CUSTOMER",
    metadata: {},
  });

  return { ok: true as const, idempotent: false };
}

export async function markArrived(input: {
  publicOrderNumber: number;
  accessToken: string;
  confirmVehicle?: boolean;
  vehicleUpdate?: { makeModel: string; color: string; plateHint?: string | null };
}) {
  const requestId = newRequestId();
  const rl = rateLimit(
    `arrived:${input.publicOrderNumber}:${hashToken(input.accessToken).slice(0, 8)}`,
    10,
    60_000,
  );
  if (!rl.ok) throw new DomainError("RATE_LIMITED", "حاول مرة ثانية بعد شوي");

  const { order } = await getOrderForCustomer(input);
  const supabase = createServiceClient();

  if (order.status === "CUSTOMER_ARRIVED") {
    return { ok: true as const, idempotent: true, order };
  }

  if (order.status !== "READY") {
    throw new DomainError(
      "NOT_READY",
      "طلبك بعد مو جاهز. بنحدث الحالة تلقائيًا.",
    );
  }

  if (input.vehicleUpdate) {
    await supabase
      .from("orders")
      .update({
        car_make_model_snapshot: input.vehicleUpdate.makeModel,
        car_color_snapshot: input.vehicleUpdate.color,
        plate_hint_snapshot: input.vehicleUpdate.plateHint ?? null,
      })
      .eq("id", order.id);
  }

  const check = canTransition("READY", "CUSTOMER_ARRIVED", "CUSTOMER");
  if (!check.ok) throw new DomainError("INVALID_TRANSITION", "ما نقدر نسجل وصولك الحين");

  const { data, error } = await supabase.rpc("transition_order", {
    p_order_id: order.id,
    p_from_status: "READY",
    p_to_status: "CUSTOMER_ARRIVED",
    p_event_type: eventTypeForTransition("CUSTOMER_ARRIVED"),
    p_actor_type: "CUSTOMER",
    p_actor_id: null,
    p_metadata: { flasher: true, confirmVehicle: input.confirmVehicle ?? true },
  });

  if (error) {
    if (error.message?.includes("ORDER_TRANSITION_CONFLICT")) {
      const { data: refreshed } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order.id)
        .single();
      if (refreshed?.status === "CUSTOMER_ARRIVED") {
        return { ok: true as const, idempotent: true, order: refreshed };
      }
      throw new DomainError("CONFLICT", "حاول مرة ثانية");
    }
    throw new DomainError("TRANSITION_FAILED", "صار خطأ، حاول مرة ثانية");
  }

  await supabase
    .from("orders")
    .update({ flasher_confirmed: true })
    .eq("id", order.id);

  log({
    requestId,
    orderId: order.id,
    publicOrderNumber: order.public_order_number,
    event: "customer_arrived",
  });

  return { ok: true as const, idempotent: false, order: data };
}

export async function submitLocationHint(input: {
  publicOrderNumber: number;
  accessToken: string;
  locationHint: string;
}) {
  const { order } = await getOrderForCustomer(input);
  if (order.status !== "CUSTOMER_ARRIVED" && !order.location_help_requested) {
    // Only after staff requested help, or already arrived
  }
  if (!order.location_help_requested && order.status !== "CUSTOMER_ARRIVED") {
    throw new DomainError("NOT_ALLOWED", "هالخيار مو متاح الحين");
  }

  const supabase = createServiceClient();
  await supabase
    .from("orders")
    .update({ location_hint: input.locationHint })
    .eq("id", order.id);

  await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "LOCATION_HINT_SUBMITTED",
    from_status: order.status,
    to_status: order.status,
    actor_type: "CUSTOMER",
    metadata: { locationHint: input.locationHint },
  });

  return { ok: true as const };
}

export async function getLastOrderForRepeat(anonymousToken: string) {
  const supabase = createServiceClient();
  const tokenHash = hashToken(anonymousToken);
  const { data: customer } = await supabase
    .from("anonymous_customers")
    .select("id")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!customer) return null;

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*, order_item_modifiers(*))")
    .eq("anonymous_customer_id", customer.id)
    .neq("status", "PENDING_PAYMENT")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return order;
}

export async function getDefaultVehicle(anonymousToken: string) {
  const supabase = createServiceClient();
  const tokenHash = hashToken(anonymousToken);
  const { data: customer } = await supabase
    .from("anonymous_customers")
    .select("id")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!customer) return null;

  const { data: vehicle } = await supabase
    .from("customer_vehicles")
    .select("*")
    .eq("anonymous_customer_id", customer.id)
    .eq("is_default", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return vehicle;
}
