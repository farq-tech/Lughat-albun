"use server";

import { z } from "zod";
import { DomainError } from "@/server/domain-error";
import type { ActionResult } from "./checkout";
import {
  createCafeTable,
  listAdminTables,
  rotateTableQrToken,
  setCafeTableActive,
} from "@/server/services/tables";

export async function listAdminTablesAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof listAdminTables>>>
> {
  try {
    const data = await listAdminTables();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ" };
  }
}

export async function createCafeTableAction(input: {
  tableNumber: number;
  label?: string | null;
}): Promise<
  ActionResult<Awaited<ReturnType<typeof createCafeTable>>>
> {
  try {
    const tableNumber = z.number().int().min(1).max(999).parse(input.tableNumber);
    const label = input.label?.trim() || null;
    const data = await createCafeTable({ tableNumber, label });
    return { ok: true, data };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ" };
  }
}

export async function rotateTableQrAction(input: {
  tableId: string;
}): Promise<ActionResult<Awaited<ReturnType<typeof rotateTableQrToken>>>> {
  try {
    const tableId = z.string().uuid().parse(input.tableId);
    const data = await rotateTableQrToken(tableId);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ" };
  }
}

export async function setCafeTableActiveAction(input: {
  tableId: string;
  isActive: boolean;
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const tableId = z.string().uuid().parse(input.tableId);
    const isActive = z.boolean().parse(input.isActive);
    await setCafeTableActive(tableId, isActive);
    return { ok: true, data: { ok: true } };
  } catch (e) {
    if (e instanceof DomainError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "UNKNOWN", message: "صار خطأ" };
  }
}
