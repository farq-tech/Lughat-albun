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
  none: "لم يحدد",
  on_the_way: "أنا بالطريق",
  outside: "أنا برا",
  claimed_received: "تم الاستلام",
};

/** Kitchen statuses where the customer may update arrival presence. */
export const PRESENCE_ALLOWED_ORDER_STATUSES = [
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "CUSTOMER_ARRIVED",
  "OUT_FOR_DELIVERY",
] as const;

export type PresenceUpdateResult =
  | { ok: true; idempotent?: boolean }
  | {
      ok: false;
      code:
        | "NOT_ALLOWED_STATUS"
        | "ORDER_COMPLETED"
        | "INVALID_PRESENCE"
        | "INVALID_TRANSITION";
    };

/**
 * Arrival presence is separate from kitchen status.
 * Allowed flows:
 *   none → on_the_way → outside
 *   none → outside
 * Downgrade outside → on_the_way is forbidden.
 */
export function canUpdateCustomerPresence(input: {
  orderStatus: string;
  current: CustomerPresence;
  next: CustomerPresenceAction;
}): PresenceUpdateResult {
  const terminal = ["DELIVERED", "CANCELLED", "REFUNDED", "PENDING_PAYMENT"];
  if (terminal.includes(input.orderStatus)) {
    if (["DELIVERED", "CANCELLED", "REFUNDED"].includes(input.orderStatus)) {
      return { ok: false, code: "ORDER_COMPLETED" };
    }
    return { ok: false, code: "NOT_ALLOWED_STATUS" };
  }

  if (
    !(PRESENCE_ALLOWED_ORDER_STATUSES as readonly string[]).includes(
      input.orderStatus,
    )
  ) {
    return { ok: false, code: "NOT_ALLOWED_STATUS" };
  }

  if (!CUSTOMER_PRESENCE_VALUES.includes(input.next)) {
    return { ok: false, code: "INVALID_PRESENCE" };
  }

  if (input.current === input.next) {
    return { ok: true, idempotent: true };
  }

  // No downgrade from arrived/claimed back to on_the_way
  if (
    (input.current === "outside" || input.current === "claimed_received") &&
    input.next === "on_the_way"
  ) {
    return { ok: false, code: "INVALID_TRANSITION" };
  }

  // claimed_received is terminal for presence (except idempotent)
  if (input.current === "claimed_received" && input.next !== "claimed_received") {
    return { ok: false, code: "INVALID_TRANSITION" };
  }

  // Allowed upgrades
  if (input.current === "none") {
    if (
      input.next === "on_the_way" ||
      input.next === "outside" ||
      input.next === "claimed_received"
    ) {
      return { ok: true };
    }
  }

  if (input.current === "on_the_way") {
    if (input.next === "outside" || input.next === "claimed_received") {
      return { ok: true };
    }
  }

  if (input.current === "outside" && input.next === "claimed_received") {
    return { ok: true };
  }

  return { ok: false, code: "INVALID_TRANSITION" };
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

export function nextPresenceActions(
  current: CustomerPresence,
): CustomerPresenceAction[] {
  if (current === "none") return ["on_the_way", "outside"];
  if (current === "on_the_way") return ["outside"];
  if (current === "outside") return ["claimed_received"];
  return [];
}
