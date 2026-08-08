import { describe, expect, it } from "vitest";
import { checkoutSchema, toDbPaymentMethod } from "@/lib/validation/checkout";

describe("payment method checkout wiring", () => {
  it("accepts cash_on_delivery and maps to CASH_ON_DELIVERY", () => {
    const parsed = checkoutSchema.parse({
      items: [
        {
          productId: "22222222-2222-2222-2222-222222222222",
          quantity: 1,
          modifiers: [],
        },
      ],
      phone: "0501234567",
      source: "qr",
      idempotencyKey: "idem-cod-test-1234",
      paymentMethod: "cash_on_delivery",
    });
    expect(parsed.paymentMethod).toBe("cash_on_delivery");
    expect(toDbPaymentMethod(parsed.paymentMethod)).toBe("CASH_ON_DELIVERY");
  });

  it("keeps electronic methods mapped for card rails", () => {
    expect(toDbPaymentMethod("apple_pay")).toBe("APPLE_PAY");
    expect(toDbPaymentMethod("mada")).toBe("MADA");
    expect(toDbPaymentMethod("visa")).toBe("VISA");
    expect(toDbPaymentMethod("mastercard")).toBe("MASTERCARD");
  });
});
