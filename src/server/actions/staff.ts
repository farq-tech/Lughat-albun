"use server";

import { z } from "zod";
import type { OrderStatus } from "@/types/database";
import {
  getStaffOrder,
  listStaffQueue,
  staffCannotLocate,
  staffTransition,
} from "@/server/services/staff";
import { DomainError } from "@/server/services/checkout";
import type { ActionResult } from "./checkout";

export async function getStaffQueueAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof listStaffQueue>>>
> {
  try {
    const data = await listStaffQueue();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ" };
  }
}

export async function getStaffOrderAction(input: {
  orderId: string;
}): Promise<ActionResult<Awaited<ReturnType<typeof getStaffOrder>>>> {
  try {
    const orderId = z.string().uuid().parse(input.orderId);
    const data = await getStaffOrder(orderId);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ" };
  }
}

export async function staffTransitionAction(input: {
  orderId: string;
  toStatus: OrderStatus;
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const orderId = z.string().uuid().parse(input.orderId);
    await staffTransition({ orderId, toStatus: input.toStatus });
    return { ok: true, data: { ok: true } };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ" };
  }
}

export async function staffCannotLocateAction(input: {
  orderId: string;
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const orderId = z.string().uuid().parse(input.orderId);
    await staffCannotLocate(orderId);
    return { ok: true, data: { ok: true } };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ" };
  }
}
