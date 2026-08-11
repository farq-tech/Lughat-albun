import {
  canUpdateCustomerPresence,
  eventTypeForPresence,
  type CustomerPresence,
  type CustomerPresenceAction,
} from "@/domains/orders/customer-presence";
import { hashToken } from "@/lib/auth/customer-token";
import { log, newRequestId } from "@/lib/logging";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { DomainError } from "./checkout";

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

  return {
    order: {
      ...order,
      customer_presence: normalizePresence(order.customer_presence),
    },
    items: items ?? [],
    events: events ?? [],
  };
}

export async function setCustomerPresence(input: {
  publicOrderNumber: number;
  accessToken: string;
  presence: CustomerPresenceAction;
}) {
  const requestId = newRequestId();
  const rl = rateLimit(
    `presence:${input.publicOrderNumber}:${hashToken(input.accessToken).slice(0, 8)}`,
    20,
    60_000,
  );
  if (!rl.ok) throw new DomainError("RATE_LIMITED", "حاول مرة ثانية بعد شوي");

  const { order } = await getOrderForCustomer(input);

  if (order.order_type === "DINE_IN") {
    throw new DomainError(
      "NOT_ALLOWED_STATUS",
      "طلبات الطاولة ما تحتاج تأكيد وصول.",
    );
  }

  const current = normalizePresence(order.customer_presence);

  const allowed = canUpdateCustomerPresence({
    orderStatus: order.status,
    current,
    next: input.presence,
  });

  if (!allowed.ok) {
    if (allowed.code === "NOT_ALLOWED_STATUS") {
      throw new DomainError(
        "NOT_ALLOWED_STATUS",
        "ما نقدر نحدّث موقعك بهالمرحلة.",
      );
    }
    if (allowed.code === "ORDER_COMPLETED") {
      throw new DomainError("ORDER_COMPLETED", "الطلب مكتمل، ما نقدر نغيّر الحالة");
    }
    if (allowed.code === "INVALID_TRANSITION") {
      throw new DomainError(
        "INVALID_TRANSITION",
        "ما يصير ترجع لحالة سابقة بعد ما وصلت.",
      );
    }
    throw new DomainError("INVALID_STATE", "ما نقدر نسجل هالخطوة الحين");
  }

  if (allowed.idempotent) {
    return { ok: true as const, idempotent: true, presence: current };
  }

  const now = new Date().toISOString();
  const supabase = createServiceClient();
  const patch: Record<string, unknown> = {
    customer_presence: input.presence,
    customer_presence_updated_at: now,
    customer_on_the_way:
      input.presence === "on_the_way" || input.presence === "outside"
        ? true
        : order.customer_on_the_way,
  };

  if (input.presence === "on_the_way") {
    patch.on_my_way_at = order.on_my_way_at ?? now;
  }
  if (input.presence === "outside") {
    patch.customer_arrived_at = order.customer_arrived_at ?? now;
    patch.flasher_confirmed = true;
  }

  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", order.id)
    .eq("status", order.status);

  if (error) {
    throw new DomainError("UPDATE_FAILED", "صار خطأ، حاول مرة ثانية");
  }

  await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: eventTypeForPresence(input.presence),
    from_status: order.status,
    to_status: order.status,
    actor_type: "CUSTOMER",
    metadata: {
      fromPresence: current,
      toPresence: input.presence,
    },
  });

  log({
    requestId,
    orderId: order.id,
    publicOrderNumber: order.public_order_number,
    event: "customer_presence_updated",
    presence: input.presence,
  });

  return {
    ok: true as const,
    idempotent: false,
    presence: input.presence,
  };
}

/** @deprecated Prefer setCustomerPresence({ presence: "on_the_way" }) */
export async function markOnTheWay(input: {
  publicOrderNumber: number;
  accessToken: string;
}) {
  return setCustomerPresence({ ...input, presence: "on_the_way" });
}

/** @deprecated Prefer setCustomerPresence({ presence: "outside" }) */
export async function markArrived(input: {
  publicOrderNumber: number;
  accessToken: string;
  confirmVehicle?: boolean;
  vehicleUpdate?: {
    makeModel: string;
    color: string;
    plateHint?: string | null;
  };
}) {
  if (input.vehicleUpdate) {
    const { order } = await getOrderForCustomer(input);
    const supabase = createServiceClient();
    await supabase
      .from("orders")
      .update({
        car_make_model_snapshot: input.vehicleUpdate.makeModel,
        car_color_snapshot: input.vehicleUpdate.color,
        plate_hint_snapshot: input.vehicleUpdate.plateHint ?? null,
      })
      .eq("id", order.id);
  }

  const result = await setCustomerPresence({
    publicOrderNumber: input.publicOrderNumber,
    accessToken: input.accessToken,
    presence: "outside",
  });

  return { ...result, order: null };
}

export async function submitLocationHint(input: {
  publicOrderNumber: number;
  accessToken: string;
  locationHint: string;
}) {
  const { order } = await getOrderForCustomer(input);
  const presence = normalizePresence(order.customer_presence);
  const arrivedLike =
    presence === "outside" ||
    order.status === "CUSTOMER_ARRIVED" ||
    order.location_help_requested;

  if (!arrivedLike) {
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
