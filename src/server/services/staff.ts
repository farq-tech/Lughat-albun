import {
  canTransition,
  eventTypeForTransition,
  staffPrimaryAction,
} from "@/domains/orders/state-machine";
import { log, newRequestId } from "@/lib/logging";
import { rateLimit } from "@/lib/rate-limit";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { DomainError } from "./checkout";
import type { OrderStatus, StaffRole } from "@/types/database";

export async function requireStaff(minRole: StaffRole = "STAFF") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new DomainError("UNAUTHORIZED", "لازم تسجل دخول");

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    throw new DomainError("FORBIDDEN", "حسابك مو مفعّل");
  }

  const rank: Record<StaffRole, number> = { STAFF: 1, MANAGER: 2, ADMIN: 3 };
  if (rank[profile.role as StaffRole] < rank[minRole]) {
    throw new DomainError("FORBIDDEN", "ما عندك صلاحية");
  }

  return { user, profile };
}

export async function listStaffQueue() {
  await requireStaff("STAFF");
  const supabase = createServiceClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(id)")
    .in("status", [
      "PAID",
      "ACCEPTED",
      "PREPARING",
      "READY",
      "CUSTOMER_ARRIVED",
      "OUT_FOR_DELIVERY",
    ])
    .order("customer_arrived_at", { ascending: true, nullsFirst: false })
    .order("paid_at", { ascending: true });

  return (orders ?? []).map((o) => ({
    ...o,
    itemCount: o.order_items?.length ?? 0,
    primaryAction: staffPrimaryAction(o.status),
  }));
}

export async function getStaffOrder(orderId: string) {
  await requireStaff("STAFF");
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new DomainError("ORDER_NOT_FOUND", "الطلب غير موجود");

  const [{ data: items }, { data: events }] = await Promise.all([
    supabase
      .from("order_items")
      .select("*, order_item_modifiers(*)")
      .eq("order_id", orderId),
    supabase
      .from("order_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);

  return { order, items: items ?? [], events: events ?? [] };
}

export async function staffTransition(input: {
  orderId: string;
  toStatus: OrderStatus;
}) {
  const requestId = newRequestId();
  const { user } = await requireStaff("STAFF");
  const rl = rateLimit(`staff_transition:${user.id}`, 120, 60_000);
  if (!rl.ok) throw new DomainError("RATE_LIMITED", "حاول مرة ثانية");

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", input.orderId)
    .single();
  if (!order) throw new DomainError("ORDER_NOT_FOUND", "الطلب غير موجود");

  // Convenience: PAID → ACCEPTED → PREPARING in one "ابدأ" can go to PREPARING
  let from = order.status as OrderStatus;
  let to = input.toStatus;

  if (from === "PAID" && to === "ACCEPTED") {
    // accept then auto-preparing for speed
    const accept = canTransition(from, "ACCEPTED", "STAFF");
    if (!accept.ok) throw new DomainError("INVALID_TRANSITION", "انتقال غير مسموح");
    const { error: e1 } = await supabase.rpc("transition_order", {
      p_order_id: order.id,
      p_from_status: "PAID",
      p_to_status: "ACCEPTED",
      p_event_type: "ACCEPTED",
      p_actor_type: "STAFF",
      p_actor_id: user.id,
      p_metadata: {},
    });
    if (e1) throw new DomainError("CONFLICT", "أحد غير الحالة قبلك");
    from = "ACCEPTED";
    to = "PREPARING";
  }

  const check = canTransition(from, to, "STAFF");
  if (!check.ok) throw new DomainError("INVALID_TRANSITION", "انتقال غير مسموح");

  const { data, error } = await supabase.rpc("transition_order", {
    p_order_id: order.id,
    p_from_status: from,
    p_to_status: to,
    p_event_type: eventTypeForTransition(to),
    p_actor_type: "STAFF",
    p_actor_id: user.id,
    p_metadata: {},
  });

  if (error) {
    if (error.message?.includes("ORDER_TRANSITION_CONFLICT")) {
      throw new DomainError("CONFLICT", "أحد غير الحالة قبلك");
    }
    throw new DomainError("TRANSITION_FAILED", "فشل تحديث الحالة");
  }

  log({
    requestId,
    orderId: order.id,
    publicOrderNumber: order.public_order_number,
    event: "staff_transition",
    actorId: user.id,
    to,
  });

  return { order: data };
}

export async function staffCannotLocate(orderId: string) {
  const { user } = await requireStaff("STAFF");
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (!order) throw new DomainError("ORDER_NOT_FOUND", "الطلب غير موجود");
  if (order.status !== "CUSTOMER_ARRIVED") {
    throw new DomainError("INVALID_STATE", "الطلب مو في حالة وصول");
  }

  await supabase
    .from("orders")
    .update({ location_help_requested: true })
    .eq("id", orderId);

  await supabase.from("order_events").insert({
    order_id: orderId,
    event_type: "LOCATION_HELP_REQUESTED",
    from_status: order.status,
    to_status: order.status,
    actor_type: "STAFF",
    actor_id: user.id,
    metadata: {},
  });

  return { ok: true as const };
}
