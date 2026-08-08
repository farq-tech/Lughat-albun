import type { OrderStatus } from "@/types/database";

/**
 * Kitchen / fulfillment order statuses.
 * Display mapping (product language → DB):
 *   NEW / جديد          → PAID
 *   PREPARING / جاري التجهيز → PREPARING
 *   READY / جاهز        → READY
 *   COMPLETED / مكتمل   → DELIVERED
 *
 * Customer pickup signals (بالطريق / أنا برا / تم الاستلام) live in
 * `customer_presence`, not in this status enum.
 *
 * Legacy statuses ACCEPTED, CUSTOMER_ARRIVED, OUT_FOR_DELIVERY remain
 * for historical rows and safe completion paths.
 */
export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "CUSTOMER_ARRIVED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  // New flow: accept → preparing. Legacy: accept → ACCEPTED still allowed.
  PAID: ["PREPARING", "ACCEPTED", "CANCELLED", "REFUNDED"],
  ACCEPTED: ["PREPARING", "CANCELLED", "REFUNDED"],
  PREPARING: ["READY", "CANCELLED", "REFUNDED"],
  // New flow: staff completes from READY. Legacy arrival statuses still completable.
  READY: ["DELIVERED", "CUSTOMER_ARRIVED", "CANCELLED", "REFUNDED"],
  CUSTOMER_ARRIVED: ["DELIVERED", "OUT_FOR_DELIVERY", "CANCELLED", "REFUNDED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED", "REFUNDED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export type TransitionActor = "CUSTOMER" | "STAFF" | "SYSTEM" | "PAYMENT_PROVIDER";

/**
 * Customer no longer advances kitchen status for pickup.
 * Pickup signals use customer_presence domain instead.
 */
const ACTOR_PERMISSIONS: Record<TransitionActor, OrderStatus[]> = {
  PAYMENT_PROVIDER: ["PAID"],
  SYSTEM: ["PAID", "CANCELLED", "REFUNDED"],
  STAFF: [
    "ACCEPTED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ],
  // Customer cannot change kitchen status in the new flow.
  CUSTOMER: ["CANCELLED"],
};

export type TransitionResult =
  | { ok: true }
  | { ok: false; code: "INVALID_TRANSITION" | "FORBIDDEN_ACTOR" | "TERMINAL" };

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
): TransitionResult {
  if (from === to) {
    return { ok: true };
  }
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    if (ALLOWED_TRANSITIONS[from]?.length === 0) {
      return { ok: false, code: "TERMINAL" };
    }
    return { ok: false, code: "INVALID_TRANSITION" };
  }
  if (!ACTOR_PERMISSIONS[actor].includes(to)) {
    return { ok: false, code: "FORBIDDEN_ACTOR" };
  }
  return { ok: true };
}

export function eventTypeForTransition(to: OrderStatus): string {
  switch (to) {
    case "PAID":
      return "PAYMENT_CONFIRMED";
    case "ACCEPTED":
      return "ACCEPTED";
    case "PREPARING":
      return "PREPARING";
    case "READY":
      return "READY";
    case "CUSTOMER_ARRIVED":
      return "CUSTOMER_ARRIVED";
    case "OUT_FOR_DELIVERY":
      return "OUT_FOR_DELIVERY";
    case "DELIVERED":
      return "DELIVERED";
    case "CANCELLED":
      return "CANCELLED";
    case "REFUNDED":
      return "REFUNDED";
    default:
      return "STATUS_CHANGED";
  }
}

export function staffPrimaryAction(status: OrderStatus): {
  label: string;
  next: OrderStatus;
} | null {
  switch (status) {
    case "PAID":
    case "ACCEPTED":
      return { label: "قبول الطلب", next: "PREPARING" };
    case "PREPARING":
      return { label: "الطلب جاهز", next: "READY" };
    case "READY":
    case "CUSTOMER_ARRIVED":
    case "OUT_FOR_DELIVERY":
      return { label: "تم تسليم الطلب", next: "DELIVERED" };
    default:
      return null;
  }
}

export function customerStatusCopy(status: OrderStatus): {
  title: string;
  body: string;
} {
  switch (status) {
    case "PENDING_PAYMENT":
      return { title: "بانتظار الدفع", body: "كمّل الدفع عشان نبدأ نجهز طلبك." };
    case "PAID":
      return { title: "طلبك وصلنا", body: "بانتظار قبول الطلب من المحل." };
    case "ACCEPTED":
    case "PREPARING":
      return { title: "جاري التجهيز", body: "قاعدين نجهّز طلبك الحين." };
    case "READY":
      return {
        title: "جاهز",
        body: "طلبك جاهز. حدّثنا وين وصلت.",
      };
    case "CUSTOMER_ARRIVED":
      return { title: "عرفناك", body: "موظفنا جايك." };
    case "OUT_FOR_DELIVERY":
      return { title: "طلبك طالع لك", body: "خلك بالسيارة، جايك الحين." };
    case "DELIVERED":
      return { title: "تم تسليم الطلب", body: "بالعافية. نراك مرة ثانية." };
    case "CANCELLED":
      return { title: "الطلب ملغي", body: "إذا تبي، اطلب من جديد بسهولة." };
    case "REFUNDED":
      return { title: "تم الاسترجاع", body: "المبلغ راجع لك." };
    default:
      return { title: "طلبك", body: "" };
  }
}

export function staffStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "PAID":
      return "جديد";
    case "ACCEPTED":
    case "PREPARING":
      return "جاري التجهيز";
    case "READY":
      return "جاهز";
    case "CUSTOMER_ARRIVED":
      return "وصل";
    case "OUT_FOR_DELIVERY":
      return "طالع للعميل";
    case "DELIVERED":
      return "مكتمل";
    case "CANCELLED":
      return "ملغي";
    case "REFUNDED":
      return "مسترجع";
    default:
      return status;
  }
}
