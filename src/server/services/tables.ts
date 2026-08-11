import {
  generateOpaqueToken,
  hashToken,
} from "@/lib/auth/customer-token";
import {
  hashTableToken,
  isValidTableTokenFormat,
  tableDisplayLabel,
  tableOrderMenuPath,
  type CafeTable,
} from "@/domains/tables/tokens";
import { createServiceClient } from "@/lib/supabase/server";
import { DomainError } from "@/server/domain-error";
import { requireStaff } from "./staff";

export type ResolvedTable = {
  id: string;
  tableNumber: number;
  label: string;
  isActive: boolean;
};

export async function resolveTableByToken(
  rawToken: string,
): Promise<ResolvedTable> {
  if (!isValidTableTokenFormat(rawToken)) {
    throw new DomainError("INVALID_TABLE_TOKEN", "رمز الطاولة غير صالح");
  }
  const supabase = createServiceClient();
  const tokenHash = hashTableToken(rawToken);
  const { data: table, error } = await supabase
    .from("cafe_tables")
    .select("id, table_number, label, is_active")
    .eq("qr_token_hash", tokenHash)
    .maybeSingle();

  if (error || !table) {
    throw new DomainError("TABLE_NOT_FOUND", "ما لقينا هالطاولة");
  }
  if (!table.is_active) {
    throw new DomainError("TABLE_INACTIVE", "هالطاولة متوقفة مؤقتًا");
  }

  return {
    id: table.id,
    tableNumber: table.table_number,
    label: tableDisplayLabel(table.table_number, table.label),
    isActive: table.is_active,
  };
}

/** Find open session or create one for this table. */
export async function getOrCreateOpenTableSession(tableId: string): Promise<{
  sessionId: string;
  created: boolean;
}> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("table_sessions")
    .select("id")
    .eq("table_id", tableId)
    .eq("status", "OPEN")
    .maybeSingle();

  if (existing) {
    return { sessionId: existing.id, created: false };
  }

  const { data: created, error } = await supabase
    .from("table_sessions")
    .insert({
      table_id: tableId,
      status: "OPEN",
    })
    .select("id")
    .single();

  if (error || !created) {
    // Race: another request opened a session — re-read
    const { data: raced } = await supabase
      .from("table_sessions")
      .select("id")
      .eq("table_id", tableId)
      .eq("status", "OPEN")
      .maybeSingle();
    if (raced) return { sessionId: raced.id, created: false };
    throw new DomainError("TABLE_SESSION_FAILED", "ما قدرنا نفتح جلسة الطاولة");
  }

  return { sessionId: created.id, created: true };
}

export async function maybeCloseTableSession(sessionId: string) {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("table_session_id", sessionId)
    .not("status", "in", "(DELIVERED,CANCELLED,REFUNDED,PENDING_PAYMENT)");

  if ((count ?? 0) > 0) return { closed: false as const };

  const { error } = await supabase
    .from("table_sessions")
    .update({
      status: "CLOSED",
      closed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("status", "OPEN");

  if (error) return { closed: false as const };
  return { closed: true as const };
}

export type AdminTableRow = CafeTable & {
  open_session_id: string | null;
  active_order_count: number;
  occupancy: "empty" | "busy";
};

export async function listAdminTables(): Promise<AdminTableRow[]> {
  await requireStaff("MANAGER");
  const supabase = createServiceClient();

  const { data: tables, error } = await supabase
    .from("cafe_tables")
    .select("*")
    .order("table_number", { ascending: true });

  if (error) throw new DomainError("TABLES_LIST_FAILED", "ما قدرنا نجيب الطاولات");

  const rows = tables ?? [];
  if (rows.length === 0) return [];

  const tableIds = rows.map((t) => t.id);
  const { data: sessions } = await supabase
    .from("table_sessions")
    .select("id, table_id")
    .in("table_id", tableIds)
    .eq("status", "OPEN");

  const sessionByTable = new Map(
    (sessions ?? []).map((s) => [s.table_id as string, s.id as string]),
  );
  const sessionIds = [...sessionByTable.values()];

  const activeCountBySession = new Map<string, number>();
  if (sessionIds.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("table_session_id, status")
      .in("table_session_id", sessionIds)
      .not("status", "in", "(DELIVERED,CANCELLED,REFUNDED,PENDING_PAYMENT)");

    for (const o of orders ?? []) {
      if (!o.table_session_id) continue;
      activeCountBySession.set(
        o.table_session_id,
        (activeCountBySession.get(o.table_session_id) ?? 0) + 1,
      );
    }
  }

  return rows.map((t) => {
    const openSessionId = sessionByTable.get(t.id) ?? null;
    const activeOrderCount = openSessionId
      ? (activeCountBySession.get(openSessionId) ?? 0)
      : 0;
    return {
      ...t,
      open_session_id: openSessionId,
      active_order_count: activeOrderCount,
      occupancy: activeOrderCount > 0 || openSessionId ? ("busy" as const) : ("empty" as const),
    };
  });
}

export async function createCafeTable(input: {
  tableNumber: number;
  label?: string | null;
}): Promise<{ table: CafeTable; token: string; menuPath: string }> {
  await requireStaff("MANAGER");
  if (!Number.isInteger(input.tableNumber) || input.tableNumber < 1) {
    throw new DomainError("INVALID_TABLE_NUMBER", "رقم الطاولة غير صالح");
  }

  const token = generateOpaqueToken();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cafe_tables")
    .insert({
      table_number: input.tableNumber,
      label: input.label?.trim() || `طاولة ${input.tableNumber}`,
      qr_token_hash: hashToken(token),
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new DomainError("TABLE_EXISTS", "رقم الطاولة موجود مسبقًا");
    }
    throw new DomainError("TABLE_CREATE_FAILED", "ما قدرنا نضيف الطاولة");
  }

  return {
    table: data as CafeTable,
    token,
    menuPath: tableOrderMenuPath(token),
  };
}

export async function rotateTableQrToken(
  tableId: string,
): Promise<{ token: string; menuPath: string; tableNumber: number }> {
  await requireStaff("MANAGER");
  const token = generateOpaqueToken();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cafe_tables")
    .update({ qr_token_hash: hashToken(token) })
    .eq("id", tableId)
    .select("id, table_number")
    .single();

  if (error || !data) {
    throw new DomainError("TABLE_ROTATE_FAILED", "ما قدرنا نغيّر رمز QR");
  }

  return {
    token,
    menuPath: tableOrderMenuPath(token),
    tableNumber: data.table_number,
  };
}

export async function setCafeTableActive(tableId: string, isActive: boolean) {
  await requireStaff("MANAGER");
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("cafe_tables")
    .update({ is_active: isActive })
    .eq("id", tableId);
  if (error) throw new DomainError("TABLE_UPDATE_FAILED", "ما قدرنا نحدّث الطاولة");
  return { ok: true as const };
}

export async function closeTableSessionAdmin(sessionId: string) {
  await requireStaff("STAFF");
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("table_sessions")
    .update({
      status: "CLOSED",
      closed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("status", "OPEN");
  if (error) throw new DomainError("SESSION_CLOSE_FAILED", "ما قدرنا نسكر الجلسة");
  return { ok: true as const };
}

/** Store-open check for dine-in (no car-capacity gate). */
export async function getDineInAvailability(): Promise<{
  available: boolean;
  message: string;
}> {
  const { getDineInOrderingAvailability } = await import("./store");
  const { availability } = await getDineInOrderingAvailability();
  return {
    available: availability.available,
    message: availability.message,
  };
}
