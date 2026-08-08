import { cookies } from "next/headers";
import { OrderTracker } from "@/components/order/order-tracker";
import { Button } from "@/components/ui/button";
import { DomainError } from "@/server/services/checkout";
import { getOrderForCustomer } from "@/server/services/orders";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ publicNumber: string }>;
  searchParams: Promise<{ t?: string }>;
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

function OrderNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-display text-2xl">لغات البن</p>
      <p className="mt-8 text-lg text-[var(--ink-muted)]">ما لقينا الطلب</p>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        تأكد من الرابط أو اطلب من جديد
      </p>
      <Button asLink href="/order" className="mt-8">
        ابدأ طلب جديد
      </Button>
    </main>
  );
}

export default async function OrderStatusPage({ params, searchParams }: PageProps) {
  const { publicNumber: rawNumber } = await params;
  const { t } = await searchParams;
  const publicOrderNumber = Number(rawNumber);

  if (!Number.isFinite(publicOrderNumber) || publicOrderNumber < 1) {
    return <OrderNotFound />;
  }

  const cookieStore = await cookies();
  const accessToken =
    t ?? cookieStore.get(`lab_order_${publicOrderNumber}`)?.value ?? null;

  if (!accessToken) {
    return <OrderNotFound />;
  }

  let result;
  let domainError: DomainError | null = null;
  try {
    result = await getOrderForCustomer({
      publicOrderNumber,
      accessToken,
    });
  } catch (e) {
    if (e instanceof DomainError) {
      domainError = e;
    } else {
      return <SystemPreparing />;
    }
  }

  if (domainError?.code === "ORDER_NOT_FOUND") {
    return <OrderNotFound />;
  }
  if (domainError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="font-display text-2xl">لغات البن</p>
        <p className="mt-8 text-lg text-[var(--ink-muted)]">{domainError.message}</p>
        <Button asLink href="/order" variant="secondary" className="mt-8">
          رجوع
        </Button>
      </main>
    );
  }

  if (!result) {
    return <SystemPreparing />;
  }

  const items = result.items.map((item) => ({
    id: item.id as string,
    product_name_snapshot: item.product_name_snapshot as string,
    quantity: item.quantity as number,
    line_total_minor: item.line_total_minor as number,
  }));

  return (
    <OrderTracker
      initial={{ order: result.order as typeof result.order, items }}
      publicOrderNumber={publicOrderNumber}
      accessToken={accessToken}
    />
  );
}
