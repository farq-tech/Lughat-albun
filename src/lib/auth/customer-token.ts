import { createHash, randomBytes } from "crypto";

const COOKIE_NAME = "lab_customer";

export function getCustomerCookieName() {
  return COOKIE_NAME;
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateOrderAccessToken(): string {
  return randomBytes(24).toString("base64url");
}
