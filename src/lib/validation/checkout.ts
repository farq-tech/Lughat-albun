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

export const checkoutSchema = z
  .object({
    items: z.array(cartLineSchema).min(1, "سلتك فاضية").max(30),
    phone: z.preprocess(
      (v) => (v == null ? "" : v),
      z.string().trim(),
    ),
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
    orderType: z.enum(["CURBSIDE", "DINE_IN"]).default("CURBSIDE"),
    tableToken: z.preprocess(
      (v) => (v === "" || v == null ? null : v),
      z.string().min(12).max(128).nullable().optional(),
    ),
    idempotencyKey: z.string().min(8).max(128),
    // COD-only storefront for now.
    paymentMethod: z.literal("cash_on_delivery").default("cash_on_delivery"),
    paymentSimulate: z
      .enum(["success", "failure", "cancel", "delayed"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === "DINE_IN") {
      if (!data.tableToken) {
        ctx.addIssue({
          code: "custom",
          path: ["tableToken"],
          message: "امسح QR الطاولة من جديد",
        });
      }
      // Table orders: no customer phone/name required.
      return;
    }

    const phone = normalizeSaudiPhone(data.phone);
    if (!isValidSaudiMobile(phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "رقم الجوال غير صحيح — مثال: 0501234567",
      });
    }

    // Curbside requires vehicle details (saved id or new vehicle)
    if (!data.vehicleId && !data.vehicle) {
      ctx.addIssue({
        code: "custom",
        path: ["vehicle"],
        message: "أدخل بيانات السيارة",
      });
    }
  })
  .transform((data) => {
    if (data.orderType === "DINE_IN") {
      return {
        ...data,
        phone: "table",
        firstName: null,
        vehicle: null,
        vehicleId: null,
      };
    }
    return {
      ...data,
      phone: normalizeSaudiPhone(data.phone),
    };
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutPaymentMethod = CheckoutInput["paymentMethod"];

export function toDbPaymentMethod(
  _method: CheckoutPaymentMethod = "cash_on_delivery",
): "CASH_ON_DELIVERY" {
  return "CASH_ON_DELIVERY";
}
