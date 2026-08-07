import type { OrderStatus } from "@/types/database";

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

/** Allowed transitions. ON_MY_WAY is an event flag, not a primary status. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["ACCEPTED", "CANCELLED", "REFUNDED"],
  ACCEPTED: ["PREPARING", "CANCELLED", "REFUNDED"],
  PREPARING: ["READY", "CANCELLED", "REFUNDED"],
  READY: ["CUSTOMER_ARRIVED", "CANCELLED", "REFUNDED"],
  CUSTOMER_ARRIVED: ["OUT_FOR_DELIVERY", "CANCELLED", "REFUNDED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED", "REFUNDED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export type TransitionActor = "CUSTOMER" | "STAFF" | "SYSTEM" | "PAYMENT_PROVIDER";

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
  CUSTOMER: ["CUSTOMER_ARRIVED", "CANCELLED"],
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
      return { label: "ابدأ", next: "ACCEPTED" };
    case "ACCEPTED":
      return { label: "تحت التحضير", next: "PREPARING" };
    case "PREPARING":
      return { label: "جاهز", next: "READY" };
    case "CUSTOMER_ARRIVED":
      return { label: "خرجت له", next: "OUT_FOR_DELIVERY" };
    case "OUT_FOR_DELIVERY":
      return { label: "تم التسليم", next: "DELIVERED" };
    case "READY":
      return null;
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
    case "ACCEPTED":
      return { title: "طلبك وصلنا ☕", body: "جاري تجهيز طلبك." };
    case "PREPARING":
      return { title: "جاري تجهيز طلبك", body: "إذا قربت اضغط أنا بالطريق." };
    case "READY":
      return {
        title: "قهوتك جاهزة ☕",
        body: "إذا وصلت عند لغة البن، شغّل الفلشر واضغط وصلت.",
      };
    case "CUSTOMER_ARRIVED":
      return { title: "عرفناك", body: "موظفنا جايك." };
    case "OUT_FOR_DELIVERY":
      return { title: "طلبك طالع لك", body: "خلك بالسيارة، جايك الحين." };
    case "DELIVERED":
      return { title: "بالعافية", body: "تستاهل. نراك مرة ثانية." };
    case "CANCELLED":
      return { title: "الطلب ملغي", body: "إذا تبي، اطلب من جديد بسهولة." };
    case "REFUNDED":
      return { title: "تم الاسترجاع", body: "المبلغ راجع لك." };
    default:
      return { title: "طلبك", body: "" };
  }
}
