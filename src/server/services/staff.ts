import type { CustomerPresence } from "@/domains/orders/customer-presence";
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

function normalizePresence(value: unknown): CustomerPresence {
  if (
    value === "on_the_way" ||
    value === "outside" ||
    value === "claimed_received"
  ) {
    return value;
  }
  return "none";
}

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

  return (orders ?? []).map((o) => {
    const presence = normalizePresence(o.customer_presence);
    const inferredPresence =
      presence !== "none"
        ? presence
        : o.status === "CUSTOMER_ARRIVED" || o.status === "OUT_FOR_DELIVERY"
          ? ("outside" as const)
          : o.customer_on_the_way
            ? ("on_the_way" as const)
            : ("none" as const);

    return {
      ...o,
      customer_presence: inferredPresence,
      itemCount: o.order_items?.length ?? 0,
      primaryAction: staffPrimaryAction(o.status as OrderStatus),
    };
  });
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

  return {
    order: {
      ...order,
      customer_presence: (() => {
        const presence = normalizePresence(order.customer_presence);
        if (presence !== "none") return presence;
        if (
          order.status === "CUSTOMER_ARRIVED" ||
          order.status === "OUT_FOR_DELIVERY"
        ) {
          return "outside" as const;
        }
        if (order.customer_on_the_way) return "on_the_way" as const;
        return "none" as const;
      })(),
    },
    items: items ?? [],
    events: events ?? [],
  };
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

  const from = order.status as OrderStatus;
  let to = input.toStatus;

  // Normalize accept action: PAID/ACCEPTED → PREPARING
  if (
    (from === "PAID" || from === "ACCEPTED") &&
    (to === "ACCEPTED" || to === "PREPARING")
  ) {
    to = "PREPARING";
  }

  // Normalize complete action from ready/legacy arrival states
  if (
    (from === "READY" ||
      from === "CUSTOMER_ARRIVED" ||
      from === "OUT_FOR_DELIVERY") &&
    (to === "OUT_FOR_DELIVERY" || to === "DELIVERED")
  ) {
    to = "DELIVERED";
  }

  if (from === "DELIVERED" || from === "CANCELLED" || from === "REFUNDED") {
    throw new DomainError("ORDER_COMPLETED", "الطلب مكتمل، ما ينفع تعديله");
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
  const presence = order.customer_presence as string | undefined;
  const canHelp =
    order.status === "READY" ||
    order.status === "CUSTOMER_ARRIVED" ||
    presence === "outside" ||
    presence === "on_the_way";
  if (!canHelp) {
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
