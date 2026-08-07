"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { vehicleSchema } from "@/domains/vehicles/validation";
import {
  markArrived,
  markOnTheWay,
  submitLocationHint,
} from "@/server/services/orders";
import { DomainError } from "@/server/services/checkout";
import type { ActionResult } from "./checkout";

function getAccessToken(publicOrderNumber: number, cookieStore: Awaited<ReturnType<typeof cookies>>, explicit?: string | null) {
  return (
    explicit ||
    cookieStore.get(`lab_order_${publicOrderNumber}`)?.value ||
    null
  );
}

export async function onMyWayAction(input: {
  publicOrderNumber: number;
  accessToken?: string;
}): Promise<ActionResult<{ idempotent: boolean }>> {
  try {
    const cookieStore = await cookies();
    const token = getAccessToken(input.publicOrderNumber, cookieStore, input.accessToken);
    if (!token) return { ok: false, code: "UNAUTHORIZED", message: "ما عندك صلاحية لهالطلب" };
    const result = await markOnTheWay({
      publicOrderNumber: input.publicOrderNumber,
      accessToken: token,
    });
    return { ok: true, data: { idempotent: result.idempotent } };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ، حاول مرة ثانية" };
  }
}

export async function arrivedAction(input: {
  publicOrderNumber: number;
  accessToken?: string;
  confirmVehicle?: boolean;
  vehicleUpdate?: z.infer<typeof vehicleSchema>;
}): Promise<ActionResult<{ idempotent: boolean }>> {
  try {
    const cookieStore = await cookies();
    const token = getAccessToken(input.publicOrderNumber, cookieStore, input.accessToken);
    if (!token) return { ok: false, code: "UNAUTHORIZED", message: "ما عندك صلاحية لهالطلب" };
    const vehicleUpdate = input.vehicleUpdate
      ? vehicleSchema.parse(input.vehicleUpdate)
      : undefined;
    const result = await markArrived({
      publicOrderNumber: input.publicOrderNumber,
      accessToken: token,
      confirmVehicle: input.confirmVehicle,
      vehicleUpdate,
    });
    return { ok: true, data: { idempotent: result.idempotent } };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ، حاول مرة ثانية" };
  }
}

export async function locationHintAction(input: {
  publicOrderNumber: number;
  accessToken?: string;
  locationHint: string;
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const cookieStore = await cookies();
    const token = getAccessToken(input.publicOrderNumber, cookieStore, input.accessToken);
    if (!token) return { ok: false, code: "UNAUTHORIZED", message: "ما عندك صلاحية لهالطلب" };
    const hint = z.string().trim().min(2).max(120).parse(input.locationHint);
    await submitLocationHint({
      publicOrderNumber: input.publicOrderNumber,
      accessToken: token,
      locationHint: hint,
    });
    return { ok: true, data: { ok: true } };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ، حاول مرة ثانية" };
  }
}
