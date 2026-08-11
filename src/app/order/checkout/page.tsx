import Link from "next/link";
import { cookies } from "next/headers";
import { CheckoutForm } from "./checkout-form";
import { Button } from "@/components/ui/button";
import {
  getCustomerCookieName,
  getTableCookieName,
} from "@/lib/auth/customer-token";
import { DomainError } from "@/server/services/checkout";
import { getDefaultVehicle } from "@/server/services/orders";
import { resolveTableByToken } from "@/server/services/tables";
import type { OrderSource } from "@/types/database";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    source?: string;
    orderType?: string;
    table?: string;
  }>;
};

function SystemPreparing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-display text-2xl">لغات البن</p>
      <p className="mt-8 text-lg text-[var(--ink-muted)]">النظام قيد التجهيز</p>
      <Button asLink href="/order" variant="secondary" className="mt-8">
        رجوع
      </Button>
    </main>
  );
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const {
    source: rawSource,
    orderType: rawOrderType,
    table: tableParam,
  } = await searchParams;
  const source: OrderSource =
    rawSource === "qr" || rawSource === "repeat" || rawSource === "admin"
      ? rawSource
      : "link";

  const cookieStore = await cookies();
  const tableToken =
    tableParam?.trim() ||
    cookieStore.get(getTableCookieName())?.value ||
    null;

  const orderType: "CURBSIDE" | "DINE_IN" =
    rawOrderType === "DINE_IN" || tableToken ? "DINE_IN" : "CURBSIDE";
  let tableLabel: string | null = null;

  if (orderType === "DINE_IN") {
    if (!tableToken) {
      return (
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
          <p className="font-display text-2xl">لغات البن</p>
          <p className="mt-8 text-lg text-[var(--ink-muted)]">
            امسح QR الطاولة من جديد
          </p>
          <Button asLink href="/order/menu" variant="secondary" className="mt-8">
            رجوع
          </Button>
        </main>
      );
    }
    try {
      const table = await resolveTableByToken(tableToken);
      tableLabel = table.label;
      cookieStore.set(getTableCookieName(), tableToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
    } catch (e) {
      const message =
        e instanceof DomainError ? e.message : "ما قدرنا نفتح الطاولة";
      return (
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
          <p className="font-display text-2xl">لغات البن</p>
          <p className="mt-8 text-lg text-[var(--ink-muted)]">{message}</p>
          <Button asLink href="/order" variant="secondary" className="mt-8">
            رجوع
          </Button>
        </main>
      );
    }
  }

  let savedVehicle: Awaited<ReturnType<typeof getDefaultVehicle>> = null;

  try {
    if (orderType === "CURBSIDE") {
      const token = cookieStore.get(getCustomerCookieName())?.value;
      if (token) {
        savedVehicle = await getDefaultVehicle(token);
      }
    }
  } catch {
    return <SystemPreparing />;
  }

  const menuBackHref =
    orderType === "DINE_IN" && tableToken
      ? `/order/menu?table=${encodeURIComponent(tableToken)}`
      : `/order/menu?source=${source}`;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pb-12 pt-8">
      <header className="mb-8">
        <Link
          href={menuBackHref}
          className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          ← رجوع للقائمة
        </Link>
        <h1 className="mt-4 font-display text-2xl text-[var(--ink)]">
          إكمال الطلب
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {orderType === "DINE_IN"
            ? tableLabel
              ? `توصيل للطاولة · ${tableLabel}`
              : "توصيل للطاولة"
            : "استلام من السيارة"}
        </p>
      </header>

      <CheckoutForm
        source={orderType === "DINE_IN" ? "qr" : source}
        orderType={orderType}
        tableToken={orderType === "DINE_IN" ? tableToken : null}
        tableLabel={tableLabel}
        savedVehicle={savedVehicle}
      />
    </main>
  );
}
