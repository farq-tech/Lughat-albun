import { z } from "zod";
import { vehicleSchema } from "@/domains/vehicles/validation";
import { isValidSaudiMobile, normalizeSaudiPhone } from "./phone";

/** Accept classic UUID hex form (including non-RFC seed ids). */
const idSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "معرّف غير صالح",
  );

export const cartLineSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().min(1).max(20),
  modifiers: z.array(
    z.object({
      groupId: idSchema,
      optionId: idSchema,
    }),
  ),
});

export const checkoutSchema = z.object({
  items: z.array(cartLineSchema).min(1, "سلتك فاضية").max(30),
  phone: z
    .string()
    .trim()
    .transform(normalizeSaudiPhone)
    .refine(isValidSaudiMobile, "رقم الجوال غير صحيح — مثال: 0501234567"),
  firstName: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(40).nullable().optional(),
  ),
  vehicle: vehicleSchema.optional().nullable(),
  vehicleId: z.preprocess(
    (v) => (v === "" ? null : v),
    idSchema.nullable().optional(),
  ),
  clientTotalMinor: z.number().int().nonnegative().optional(),
  source: z.enum(["qr", "link", "repeat", "admin"]).default("link"),
  idempotencyKey: z.string().min(8).max(128),
  paymentMethod: z
    .enum([
      "apple_pay",
      "mada",
      "visa",
      "mastercard",
      "cash_on_delivery",
    ])
    .default("cash_on_delivery"),
  paymentSimulate: z
    .enum(["success", "failure", "cancel", "delayed"])
    .optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutPaymentMethod = CheckoutInput["paymentMethod"];

export function toDbPaymentMethod(
  method: CheckoutPaymentMethod,
):
  | "APPLE_PAY"
  | "MADA"
  | "VISA"
  | "MASTERCARD"
  | "CASH_ON_DELIVERY" {
  switch (method) {
    case "apple_pay":
      return "APPLE_PAY";
    case "mada":
      return "MADA";
    case "visa":
      return "VISA";
    case "mastercard":
      return "MASTERCARD";
    case "cash_on_delivery":
      return "CASH_ON_DELIVERY";
  }
}
