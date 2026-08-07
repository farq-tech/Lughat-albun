import Link from "next/link";
import { cookies } from "next/headers";
import { CheckoutForm } from "./checkout-form";
import { CheckoutEstimate } from "@/components/order/checkout-estimate";
import { Button } from "@/components/ui/button";
import { getCustomerCookieName } from "@/lib/auth/customer-token";
import { getDefaultVehicle } from "@/server/services/orders";
import type { OrderSource } from "@/types/database";

type PageProps = {
  searchParams: Promise<{ source?: string }>;
};

function SystemPreparing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-display text-2xl">لغة البن</p>
      <p className="mt-8 text-lg text-[var(--ink-muted)]">النظام قيد التجهيز</p>
      <Button asLink href="/order" variant="secondary" className="mt-8">
        رجوع
      </Button>
    </main>
  );
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { source: rawSource } = await searchParams;
  const source: OrderSource =
    rawSource === "qr" || rawSource === "repeat" || rawSource === "admin"
      ? rawSource
      : "link";

  let savedVehicle: Awaited<ReturnType<typeof getDefaultVehicle>> = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getCustomerCookieName())?.value;
    if (token) {
      savedVehicle = await getDefaultVehicle(token);
    }
  } catch {
    return <SystemPreparing />;
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pb-12 pt-8">
      <header className="mb-8">
        <Link
          href="/order/menu"
          className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          ← رجوع للقائمة
        </Link>
        <h1 className="mt-4 font-display text-2xl text-[var(--ink)]">
          إكمال الطلب
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          🚗 استلام من السيارة
        </p>
      </header>

      <CheckoutEstimate>
        {(displayTotalMinor) => (
          <CheckoutForm
            source={source}
            savedVehicle={savedVehicle}
            displayTotalMinor={displayTotalMinor}
          />
        )}
      </CheckoutEstimate>
    </main>
  );
}
