import { describe, expect, it } from "vitest";
import { checkoutSchema, toDbPaymentMethod } from "@/lib/validation/checkout";

const baseCurbside = {
  items: [
    {
      productId: "22222222-2222-2222-2222-222222222222",
      quantity: 1,
      modifiers: [],
    },
  ],
  phone: "0501234567",
  source: "qr" as const,
  vehicle: {
    makeModel: "كامري",
    color: "أبيض",
    plateHint: "123",
  },
};

describe("payment method checkout wiring", () => {
  it("accepts cash_on_delivery and maps to CASH_ON_DELIVERY", () => {
    const parsed = checkoutSchema.parse({
      ...baseCurbside,
      idempotencyKey: "idem-cod-test-1234",
      paymentMethod: "cash_on_delivery",
    });
    expect(parsed.paymentMethod).toBe("cash_on_delivery");
    expect(toDbPaymentMethod(parsed.paymentMethod)).toBe("CASH_ON_DELIVERY");
  });

  it("defaults to cash_on_delivery only", () => {
    const parsed = checkoutSchema.parse({
      ...baseCurbside,
      idempotencyKey: "idem-cod-default-1234",
    });
    expect(parsed.paymentMethod).toBe("cash_on_delivery");
    expect(parsed.orderType).toBe("CURBSIDE");
  });

  it("accepts dine-in with phone and tableToken without vehicle", () => {
    const parsed = checkoutSchema.parse({
      items: baseCurbside.items,
      phone: "0501234567",
      source: "qr",
      orderType: "DINE_IN",
      tableToken: "table_token_seed_01",
      idempotencyKey: "idem-dine-in-123456",
    });
    expect(parsed.orderType).toBe("DINE_IN");
    expect(parsed.tableToken).toBe("table_token_seed_01");
    expect(parsed.phone).toBe("0501234567");
    expect(parsed.vehicle).toBeNull();
  });

  it("rejects dine-in without phone", () => {
    expect(() =>
      checkoutSchema.parse({
        items: baseCurbside.items,
        source: "qr",
        orderType: "DINE_IN",
        tableToken: "table_token_seed_01",
        idempotencyKey: "idem-dine-no-phone-12",
      }),
    ).toThrow();
  });

  it("rejects curbside without phone", () => {
    expect(() =>
      checkoutSchema.parse({
        items: baseCurbside.items,
        vehicle: baseCurbside.vehicle,
        source: "qr",
        idempotencyKey: "idem-car-no-phone-123",
      }),
    ).toThrow();
  });

  it("rejects dine-in without tableToken", () => {
    expect(() =>
      checkoutSchema.parse({
        items: baseCurbside.items,
        phone: "0501234567",
        orderType: "DINE_IN",
        idempotencyKey: "idem-dine-missing-tok",
      }),
    ).toThrow();
  });

  it("rejects electronic payment methods", () => {
    expect(() =>
      checkoutSchema.parse({
        ...baseCurbside,
        idempotencyKey: "idem-cod-reject-1234",
        paymentMethod: "apple_pay",
      }),
    ).toThrow();
  });
});
