import { describe, expect, it } from "vitest";
import { assertMinor, calculateTax, formatSar } from "@/lib/money";

describe("money", () => {
  it("formats SAR from minor units", () => {
    expect(formatSar(1800)).toBe("18 ر.س");
    expect(formatSar(1850)).toBe("18.50 ر.س");
  });

  it("rejects floats", () => {
    expect(() => assertMinor(18.5)).toThrow();
  });

  it("calculates 15% VAT in integer space", () => {
    expect(calculateTax(2600, 1500)).toBe(390);
    expect(calculateTax(1000, 1500)).toBe(150);
  });
});
