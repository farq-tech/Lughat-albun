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

/**
 * Extract opaque table token from a scanned QR payload.
 * Accepts full app URLs or a raw token string.
 */
export function parseTableTokenFromScan(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (isValidTableTokenFormat(value) && !value.includes("://") && !value.includes("/")) {
    return value;
  }

  try {
    const url = new URL(value, "https://lughat-albun.local");
    const fromQuery =
      url.searchParams.get("table")?.trim() ||
      url.searchParams.get("t")?.trim() ||
      null;
    if (fromQuery && isValidTableTokenFormat(fromQuery)) return fromQuery;

    // /order/table/enter?table=… already handled by searchParams
    const pathMatch = url.pathname.match(/\/order\/(?:menu|table\/enter)\/?/i);
    if (pathMatch && fromQuery && isValidTableTokenFormat(fromQuery)) {
      return fromQuery;
    }
  } catch {
    // not a URL
  }

  // Last resort: query fragment inside free text
  const embedded = value.match(/[?&]table=([^&\s#]+)/i);
  if (embedded?.[1]) {
    const decoded = decodeURIComponent(embedded[1]);
    if (isValidTableTokenFormat(decoded)) return decoded;
  }

  return null;
}

export function tableDisplayLabel(
  tableNumber: number,
  label?: string | null,
): string {
  if (label && label.trim()) return label.trim();
  return `طاولة ${tableNumber}`;
}
