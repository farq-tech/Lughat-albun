"use server";

import { z } from "zod";
import { DomainError } from "@/server/services/checkout";
import {
  getAdminDashboardStats,
  setProductAvailability,
} from "@/server/services/admin";
import type { ActionResult } from "./checkout";

export async function toggleProductAvailabilityAction(input: {
  productId: string;
  isAvailable: boolean;
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const productId = z.string().uuid().parse(input.productId);
    const isAvailable = z.boolean().parse(input.isAvailable);
    await setProductAvailability(productId, isAvailable);
    return { ok: true, data: { ok: true } };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ" };
  }
}

export async function getAdminStatsAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof getAdminDashboardStats>>>
> {
  try {
    const data = await getAdminDashboardStats();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ" };
  }
}
