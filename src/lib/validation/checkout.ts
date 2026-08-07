import { z } from "zod";
import { vehicleSchema } from "@/domains/vehicles/validation";

export const cartLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  modifiers: z.array(
    z.object({
      groupId: z.string().uuid(),
      optionId: z.string().uuid(),
    }),
  ),
});

export const checkoutSchema = z.object({
  items: z.array(cartLineSchema).min(1).max(30),
  phone: z
    .string()
    .trim()
    .regex(/^(05\d{8}|\+9665\d{8})$/, "رقم الجوال غير صحيح"),
  firstName: z.string().trim().max(40).optional().nullable(),
  vehicle: vehicleSchema.optional().nullable(),
  vehicleId: z.string().uuid().optional().nullable(),
  clientTotalMinor: z.number().int().nonnegative().optional(),
  source: z.enum(["qr", "link", "repeat", "admin"]).default("link"),
  idempotencyKey: z.string().min(8).max(128),
  paymentSimulate: z
    .enum(["success", "failure", "cancel", "delayed"])
    .optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
