import type { CustomerPresence } from "@/domains/orders/customer-presence";
import type { OrderStatus } from "@/types/database";
import type { StaffMessages } from "./types";

export function formatStaffWait(
  minutes: number,
  wait: StaffMessages["wait"],
): string {
  if (minutes < 1) return wait.now;
  if (minutes < 60) return wait.minutes(minutes);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? wait.hoursMinutes(h, m) : wait.hours(h);
}

export function actionLabelForNext(
  next: OrderStatus,
  actions: StaffMessages["actions"],
): string {
  switch (next) {
    case "PREPARING":
      return actions.accept;
    case "READY":
      return actions.markReady;
    case "DELIVERED":
      return actions.markDelivered;
    default:
      return next;
  }
}

export function statusLabel(
  status: OrderStatus,
  labels: StaffMessages["status"],
): string {
  return labels[status] ?? status;
}

export function presenceLabel(
  presence: CustomerPresence,
  labels: StaffMessages["presence"],
): string {
  return labels[presence];
}

export function staffErrorMessage(
  code: string | undefined,
  fallback: string | undefined,
  errors: StaffMessages["errors"],
): string {
  if (code && code in errors) {
    return errors[code as keyof typeof errors];
  }
  return fallback && fallback.trim().length > 0 ? fallback : errors.generic;
}
