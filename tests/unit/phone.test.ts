import { describe, expect, it } from "vitest";
import {
  isValidSaudiMobile,
  normalizeSaudiPhone,
} from "@/lib/validation/phone";
import { checkoutSchema } from "@/lib/validation/checkout";

describe("normalizeSaudiPhone", () => {
  it("accepts standard local format", () => {
    expect(normalizeSaudiPhone("0501234567")).toBe("0501234567");
    expect(isValidSaudiMobile("0501234567")).toBe(true);
  });

  it("normalizes spaces and missing leading zero", () => {
    expect(normalizeSaudiPhone("050 123 4567")).toBe("0501234567");
    expect(normalizeSaudiPhone("501234567")).toBe("0501234567");
  });

  it("normalizes Arabic digits", () => {
    expect(normalizeSaudiPhone("٠٥٠١٢٣٤٥٦٧")).toBe("0501234567");
  });
});

describe("checkoutSchema", () => {
  const base = {
    items: [
      {
        productId: "22222222-2222-2222-2222-222222222201",
        quantity: 1,
        modifiers: [],
      },
    ],
    phone: "0501234567",
    vehicle: { makeModel: "كامري", color: "ابيض", plateHint: null },
    source: "qr" as const,
    idempotencyKey: "idempotency-key-12345",
  };

  it("accepts empty plate hint", () => {
    const parsed = checkoutSchema.parse({
      ...base,
      vehicle: { makeModel: "كامري", color: "ابيض", plateHint: "" },
    });
    expect(parsed.vehicle?.plateHint).toBeNull();
  });

  it("rejects bad phone with clear message", () => {
    const result = checkoutSchema.safeParse({ ...base, phone: "123" });
    expect(result.success).toBe(false);
  });
});
