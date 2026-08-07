import { describe, expect, it } from "vitest";
import { canTransition } from "@/domains/orders/state-machine";

describe("order state machine", () => {
  it("allows happy path", () => {
    expect(canTransition("PENDING_PAYMENT", "PAID", "PAYMENT_PROVIDER").ok).toBe(true);
    expect(canTransition("PAID", "ACCEPTED", "STAFF").ok).toBe(true);
    expect(canTransition("ACCEPTED", "PREPARING", "STAFF").ok).toBe(true);
    expect(canTransition("PREPARING", "READY", "STAFF").ok).toBe(true);
    expect(canTransition("READY", "CUSTOMER_ARRIVED", "CUSTOMER").ok).toBe(true);
    expect(canTransition("CUSTOMER_ARRIVED", "OUT_FOR_DELIVERY", "STAFF").ok).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED", "STAFF").ok).toBe(true);
  });

  it("blocks customer from marking arrived before ready", () => {
    expect(canTransition("PREPARING", "CUSTOMER_ARRIVED", "CUSTOMER").ok).toBe(false);
  });

  it("blocks staff from forging PAID", () => {
    expect(canTransition("PENDING_PAYMENT", "PAID", "STAFF").ok).toBe(false);
  });

  it("blocks skipping states", () => {
    expect(canTransition("PAID", "READY", "STAFF").ok).toBe(false);
  });

  it("treats same status as idempotent ok", () => {
    expect(canTransition("READY", "READY", "CUSTOMER").ok).toBe(true);
  });
});
