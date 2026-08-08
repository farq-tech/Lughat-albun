import { z } from "zod";

export const vehicleSchema = z.object({
  makeModel: z
    .string()
    .trim()
    .min(2, "اكتب نوع السيارة")
    .max(40, "نوع السيارة طويل"),
  color: z
    .string()
    .trim()
    .min(2, "اكتب لون السيارة")
    .max(30, "لون السيارة طويل"),
  plateHint: z.preprocess(
    (value) => {
      if (value == null) return null;
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    },
    z
      .string()
      .max(3, "آخر 3 فقط")
      .regex(/^[\p{L}\p{N}]+$/u, "حروف أو أرقام فقط")
      .nullable(),
  ),
});

export type VehicleForm = z.infer<typeof vehicleSchema>;

export const LOCATION_HINTS = [
  { id: "front", label: "قدام المحل" },
  { id: "right", label: "يمين" },
  { id: "left", label: "يسار" },
  { id: "opposite", label: "مقابل" },
  { id: "behind", label: "خلف" },
] as const;

export function formatVehicleLabel(makeModel: string, color: string): string {
  return `${makeModel} ${color}`.trim();
}
