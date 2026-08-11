import { hashToken } from "@/lib/auth/customer-token";

export type TableSessionStatus = "OPEN" | "CLOSED";

export type CafeTable = {
  id: string;
  table_number: number;
  label: string | null;
  qr_token_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TableSession = {
  id: string;
  table_id: string;
  status: TableSessionStatus;
  started_at: string;
  closed_at: string | null;
};

/** Opaque table QR token → SHA-256 hex for DB lookup. */
export function hashTableToken(token: string): string {
  return hashToken(token.trim());
}

export function isValidTableTokenFormat(token: string): boolean {
  const t = token.trim();
  return t.length >= 12 && t.length <= 128;
}

export function tableOrderMenuPath(token: string): string {
  return `/order/menu?table=${encodeURIComponent(token)}`;
}

export function tableDisplayLabel(
  tableNumber: number,
  label?: string | null,
): string {
  if (label && label.trim()) return label.trim();
  return `طاولة ${tableNumber}`;
}
