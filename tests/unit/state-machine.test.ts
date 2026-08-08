import { describe, expect, it } from "vitest";
import {
  canTransition,
  staffPrimaryAction,
  customerStatusCopy,
} from "@/domains/orders/state-machine";
import { canUpdateCustomerPresence } from "@/domains/orders/customer-presence";

describe("order kitchen state machine", () => {
  it("accepts paid order → PREPARING (قبول الطلب)", () => {
    expect(canTransition("PAID", "PREPARING", "STAFF")).toEqual({ ok: true });
    expect(staffPrimaryAction("PAID")).toEqual({
      label: "قبول الطلب",
      next: "PREPARING",
    });
  });

  it("allows PREPARING → READY by staff only", () => {
    expect(canTransition("PREPARING", "READY", "STAFF")).toEqual({ ok: true });
    expect(canTransition("PREPARING", "READY", "CUSTOMER").ok).toBe(false);
    expect(staffPrimaryAction("PREPARING")).toEqual({
      label: "الطلب جاهز",
      next: "READY",
    });
  });

  it("allows staff to complete READY → DELIVERED (تم تسليم الطلب)", () => {
    expect(canTransition("READY", "DELIVERED", "STAFF")).toEqual({ ok: true });
    expect(staffPrimaryAction("READY")).toEqual({
      label: "تم تسليم الطلب",
      next: "DELIVERED",
    });
  });

  it("rejects invalid transitions and unauthorized roles", () => {
    expect(canTransition("PAID", "READY", "STAFF").ok).toBe(false);
    expect(canTransition("PREPARING", "DELIVERED", "STAFF").ok).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "PAID", "STAFF").ok).toBe(false);
    expect(canTransition("READY", "CUSTOMER_ARRIVED", "CUSTOMER").ok).toBe(
      false,
    );
    expect(canTransition("READY", "DELIVERED", "CUSTOMER").ok).toBe(false);
  });

  it("blocks modifications after COMPLETED (DELIVERED)", () => {
    expect(canTransition("DELIVERED", "READY", "STAFF")).toEqual({
      ok: false,
      code: "TERMINAL",
    });
    expect(canTransition("DELIVERED", "PREPARING", "STAFF").ok).toBe(false);
    expect(staffPrimaryAction("DELIVERED")).toBeNull();
  });

  it("keeps legacy ACCEPTED path into PREPARING", () => {
    expect(canTransition("PAID", "ACCEPTED", "STAFF").ok).toBe(true);
    expect(canTransition("ACCEPTED", "PREPARING", "STAFF").ok).toBe(true);
    expect(staffPrimaryAction("ACCEPTED")?.next).toBe("PREPARING");
  });

  it("shows customer-facing copy for preparing and ready", () => {
    expect(customerStatusCopy("PREPARING").title).toBe("جاري التجهيز");
    expect(customerStatusCopy("READY").title).toBe("جاهز");
    expect(customerStatusCopy("DELIVERED").title).toBe("تم تسليم الطلب");
  });
});

describe("customer presence after order placement", () => {
  it("allows arrival signals once the order is confirmed (PAID+)", () => {
    expect(
      canUpdateCustomerPresence({
        orderStatus: "PAID",
        current: "none",
        next: "on_the_way",
      }).ok,
    ).toBe(true);
  });

  it("blocks arrival signals before confirmation", () => {
    expect(
      canUpdateCustomerPresence({
        orderStatus: "PENDING_PAYMENT",
        current: "none",
        next: "on_the_way",
      }).ok,
    ).toBe(false);
  });

  it("blocks presence updates after COMPLETED", () => {
    expect(
      canUpdateCustomerPresence({
        orderStatus: "DELIVERED",
        current: "claimed_received",
        next: "outside",
      }),
    ).toEqual({ ok: false, code: "ORDER_COMPLETED" });
  });
});
