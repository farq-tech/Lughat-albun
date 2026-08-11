import type { OrderStatus } from "@/types/database";
import { canTransition, type TransitionActor, type TransitionResult } from "../orders/state-machine";

export type OrderFulfillmentType = "CURBSIDE" | "DINE_IN";

/** Arrival / out-for-delivery statuses are curbside-only. */
const CURBSIDE_ONLY_STATUSES: OrderStatus[] = [
  "CUSTOMER_ARRIVED",
  "OUT_FOR_DELIVERY",
];

/**
 * Same kitchen machine for both types; dine-in skips car-arrival statuses.
 * READY → DELIVERED is the primary complete path for both.
 */
export function canTransitionForOrderType(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
  orderType: OrderFulfillmentType = "CURBSIDE",
): TransitionResult {
  if (orderType === "DINE_IN" && CURBSIDE_ONLY_STATUSES.includes(to)) {
    return { ok: false, code: "INVALID_TRANSITION" };
  }
  return canTransition(from, to, actor);
}

export function customerStatusCopyForType(
  status: OrderStatus,
  orderType: OrderFulfillmentType,
): { title: string; body: string } {
  if (orderType === "DINE_IN") {
    switch (status) {
      case "PENDING_PAYMENT":
        return { title: "بانتظار الدفع", body: "كمّل الدفع عشان نبدأ نجهز طلبك." };
      case "PAID":
        return { title: "طلبك وصلنا", body: "بانتظار قبول المحل" };
      case "ACCEPTED":
      case "PREPARING":
        return { title: "جاري التجهيز", body: "قاعدين نجهّز طلبك للطاولة." };
      case "READY":
        return {
          title: "جاهز",
          body: "طلبك جاهز — الموظف بيوصّله لطاولةك.",
        };
      case "DELIVERED":
        return { title: "تم التسليم", body: "بالعافية. لو تبي شي ثاني اطلب من نفس الرابط." };
      case "CANCELLED":
        return { title: "الطلب ملغي", body: "إذا تبي، اطلب من جديد بسهولة." };
      case "REFUNDED":
        return { title: "تم الاسترجاع", body: "المبلغ راجع لك." };
      default:
        break;
    }
  }

  // Fall through to default curbside copy via caller
  return { title: "", body: "" };
}
