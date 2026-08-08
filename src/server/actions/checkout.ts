"use server";

import { cookies } from "next/headers";
import { checkoutSchema } from "@/lib/validation/checkout";
import { getCustomerCookieName } from "@/lib/auth/customer-token";
import { createCheckoutAndPay, DomainError } from "@/server/services/checkout";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown };

export async function checkoutAction(
  raw: unknown,
): Promise<ActionResult<{
  orderId: string;
  publicOrderNumber: number;
  accessToken: string | null;
  paymentStatus: string;
}>> {
  try {
    const parsed = checkoutSchema.parse(raw);
    const cookieStore = await cookies();
    const existing = cookieStore.get(getCustomerCookieName())?.value ?? null;

    const result = await createCheckoutAndPay({
      checkout: parsed,
      anonymousToken: existing,
      requestKey: existing ?? parsed.phone,
    });

    if (result.anonymousToken) {
      cookieStore.set(getCustomerCookieName(), result.anonymousToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
      });
    }

    if (result.accessToken) {
      cookieStore.set(`lab_order_${result.publicOrderNumber}`, result.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return {
      ok: true,
      data: {
        orderId: result.orderId,
        publicOrderNumber: result.publicOrderNumber,
        accessToken: result.accessToken,
        paymentStatus: result.paymentStatus,
      },
    };
  } catch (e) {
    if (e instanceof DomainError) {
      return {
        ok: false,
        code: e.code,
        message: e.message,
        details: e.details,
      };
    }
    if (e && typeof e === "object" && "issues" in e) {
      const issues = (e as { issues?: Array<{ message?: string; path?: unknown[] }> })
        .issues;
      const first = issues?.[0]?.message;
      return {
        ok: false,
        code: "VALIDATION",
        message: first && first.length > 0 ? first : "تأكد من البيانات",
        details: e,
      };
    }
    return {
      ok: false,
      code: "UNKNOWN",
      message: "صار خطأ، حاول مرة ثانية",
    };
  }
}
