import { NextResponse, type NextRequest } from "next/server";
import {
  getTableCookieName,
  hashToken,
} from "@/lib/auth/customer-token";
import { isValidTableTokenFormat } from "@/domains/tables/tokens";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Sets the table session cookie then redirects to the menu.
 * Cookie writes are not allowed during RSC render.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("table")?.trim() ?? "";
  if (!isValidTableTokenFormat(token)) {
    const url = request.nextUrl.clone();
    url.pathname = "/order/menu";
    url.search = "table=invalid";
    return NextResponse.redirect(url);
  }

  const supabase = createServiceClient();
  const { data: table } = await supabase
    .from("cafe_tables")
    .select("id, is_active")
    .eq("qr_token_hash", hashToken(token))
    .maybeSingle();

  const menuUrl = request.nextUrl.clone();
  menuUrl.pathname = "/order/menu";
  menuUrl.search = `table=${encodeURIComponent(token)}`;

  if (!table || !table.is_active) {
    return NextResponse.redirect(menuUrl);
  }

  const response = NextResponse.redirect(menuUrl);
  response.cookies.set(getTableCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
