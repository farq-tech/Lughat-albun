export type CustomerPresence =
  | "none"
  | "on_the_way"
  | "outside"
  | "claimed_received";

export const CUSTOMER_PRESENCE_VALUES: CustomerPresence[] = [
  "none",
  "on_the_way",
  "outside",
  "claimed_received",
];

export type CustomerPresenceAction =
  | "on_the_way"
  | "outside"
  | "claimed_received";

export const CUSTOMER_PRESENCE_LABELS: Record<CustomerPresence, string> = {
  none: "—",
  on_the_way: "بالطريق",
  outside: "أنا برا",
  claimed_received: "تم الاستلام",
};

export type PresenceUpdateResult =
  | { ok: true; idempotent?: boolean }
  | {
      ok: false;
      code: "NOT_READY" | "ORDER_COMPLETED" | "INVALID_PRESENCE";
    };

/**
 * Customer presence updates are allowed only while order is READY
 * (kitchen done, awaiting pickup/handoff). Terminal kitchen statuses block updates.
 */
export function canUpdateCustomerPresence(input: {
  orderStatus: string;
  current: CustomerPresence;
  next: CustomerPresenceAction;
}): PresenceUpdateResult {
  const terminal = ["DELIVERED", "CANCELLED", "REFUNDED"];
  if (terminal.includes(input.orderStatus)) {
    return { ok: false, code: "ORDER_COMPLETED" };
  }

  if (input.orderStatus !== "READY") {
    // Legacy: allow presence updates if already in arrival pipeline
    const legacyArrival = ["CUSTOMER_ARRIVED", "OUT_FOR_DELIVERY"];
    if (!legacyArrival.includes(input.orderStatus)) {
      return { ok: false, code: "NOT_READY" };
    }
  }

  if (!CUSTOMER_PRESENCE_VALUES.includes(input.next)) {
    return { ok: false, code: "INVALID_PRESENCE" };
  }

  if (input.current === input.next) {
    return { ok: true, idempotent: true };
  }

  return { ok: true };
}

export function eventTypeForPresence(presence: CustomerPresenceAction): string {
  switch (presence) {
    case "on_the_way":
      return "CUSTOMER_ON_THE_WAY";
    case "outside":
      return "CUSTOMER_OUTSIDE";
    case "claimed_received":
      return "CUSTOMER_CLAIMED_RECEIVED";
  }
}
