import { describe, expect, it } from "vitest";
import {
  canUpdateCustomerPresence,
  nextPresenceActions,
} from "@/domains/orders/customer-presence";

describe("customer arrival presence", () => {
  it("allows لم يحدد → أنا بالطريق after order is placed", () => {
    expect(
      canUpdateCustomerPresence({
        orderStatus: "PAID",
        current: "none",
        next: "on_the_way",
      }),
    ).toEqual({ ok: true });
  });

  it("allows أنا بالطريق → أنا برا", () => {
    expect(
      canUpdateCustomerPresence({
        orderStatus: "PREPARING",
        current: "on_the_way",
        next: "outside",
      }),
    ).toEqual({ ok: true });
  });

  it("allows لم يحدد → أنا برا directly", () => {
    expect(
      canUpdateCustomerPresence({
        orderStatus: "PAID",
        current: "none",
        next: "outside",
      }),
    ).toEqual({ ok: true });
  });

  it("blocks أنا برا → أنا بالطريق", () => {
    expect(
      canUpdateCustomerPresence({
        orderStatus: "READY",
        current: "outside",
        next: "on_the_way",
      }),
    ).toEqual({ ok: false, code: "INVALID_TRANSITION" });
  });

  it("is idempotent for the same presence", () => {
    expect(
      canUpdateCustomerPresence({
        orderStatus: "PAID",
        current: "on_the_way",
        next: "on_the_way",
      }),
    ).toEqual({ ok: true, idempotent: true });
  });

  it("blocks presence updates on completed orders", () => {
    expect(
      canUpdateCustomerPresence({
        orderStatus: "DELIVERED",
        current: "outside",
        next: "outside",
      }).ok,
    ).toBe(false);
  });

  it("exposes the correct next UI actions", () => {
    expect(nextPresenceActions("none")).toEqual(["on_the_way", "outside"]);
    expect(nextPresenceActions("on_the_way")).toEqual(["outside"]);
    expect(nextPresenceActions("outside")).toEqual(["claimed_received"]);
    expect(nextPresenceActions("claimed_received")).toEqual([]);
  });
});
