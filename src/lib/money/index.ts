/** Integer minor units only. 18 SAR = 1800. Never use floats for money. */

export function assertMinor(value: number, label = "amount"): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer minor unit`);
  }
  return value;
}

export function formatSar(minor: number): string {
  assertMinor(minor);
  const major = Math.floor(minor / 100);
  const cents = minor % 100;
  if (cents === 0) return `${major} ر.س`;
  return `${major}.${cents.toString().padStart(2, "0")} ر.س`;
}

export function calculateTax(subtotalMinor: number, taxRateBps: number): number {
  assertMinor(subtotalMinor, "subtotal");
  if (!Number.isInteger(taxRateBps) || taxRateBps < 0) {
    throw new Error("taxRateBps must be a non-negative integer");
  }
  // Round half up in integer space
  return Math.floor((subtotalMinor * taxRateBps + 5000) / 10000);
}

export function sumMinor(values: number[]): number {
  return values.reduce((acc, v) => acc + assertMinor(v), 0);
}
