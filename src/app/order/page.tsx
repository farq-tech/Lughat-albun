import Image from "next/image";
import { redirect } from "next/navigation";
import { SocialLinks } from "@/components/brand/social-links";
import { OrderModePicker } from "@/components/order/order-mode-picker";
import {
  getDineInOrderingAvailability,
  getStoreAvailability,
} from "@/server/services/store";

type PageProps = {
  searchParams: Promise<{ source?: string; table?: string }>;
};

function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-4 animate-fade-up">
      <Image
        src="/brand/lughat-albun-logo-circle.png"
        alt="لغات البن"
        width={160}
        height={160}
        priority
        className="size-36 rounded-full object-cover shadow-sm sm:size-40"
      />
      <div className="flex flex-col items-center gap-1">
        <span className="font-display text-[2.75rem] leading-none tracking-tight text-[var(--ink)] sm:text-5xl">
          لغات البن
        </span>
        <span className="text-xs font-semibold tracking-[0.22em] text-[var(--accent)] uppercase">
          Coffee Languages
        </span>
      </div>
    </div>
  );
}

function SystemPreparing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <BrandMark />
      <p className="mt-10 text-lg text-[var(--ink-muted)] animate-fade-up stagger-1">
        النظام قيد التجهيز
      </p>
      <p className="mt-2 text-sm text-[var(--ink-muted)] animate-fade-up stagger-2">
        حاول مرة ثانية بعد قليل
      </p>
    </main>
  );
}

export default async function OrderLandingPage({ searchParams }: PageProps) {
  const { source, table } = await searchParams;

  // Table QR deep-link: set cookie via route handler, then open menu.
  if (table?.trim()) {
    redirect(`/order/table/enter?table=${encodeURIComponent(table.trim())}`);
  }

  const orderSource = source === "qr" ? "qr" : "link";

  let carData: Awaited<ReturnType<typeof getStoreAvailability>> | null = null;
  let dineInData: Awaited<ReturnType<typeof getDineInOrderingAvailability>> | null =
    null;

  try {
    [carData, dineInData] = await Promise.all([
      getStoreAvailability(),
      getDineInOrderingAvailability(),
    ]);
  } catch {
    return <SystemPreparing />;
  }

  const carAvailable = carData.availability.available;
  const dineInAvailable = dineInData.availability.available;
  const store = dineInData.store ?? carData.store;
  const carHref = `/order/menu?source=${orderSource}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-7 pb-10 pt-12">
      <header className="flex flex-col items-center text-center">
        <BrandMark />
      </header>

      <section className="mt-10 flex flex-1 flex-col items-center text-center animate-fade-up stagger-2">
        <h1 className="font-display text-3xl leading-snug text-[var(--ink)] sm:text-4xl">
          قهوتك… بطريقتك.
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--ink-muted)]">
          محلي على الطاولة، أو من السيارة — نفس المنيو، نفس الجودة.
        </p>
        {store ? (
          <p className="mt-6 text-sm text-[var(--ink-muted)]">{store.name_ar}</p>
        ) : null}
      </section>

      <OrderModePicker
        carAvailable={carAvailable}
        dineInAvailable={dineInAvailable}
        carMessage={
          carData.availability.available
            ? undefined
            : carData.availability.message
        }
        dineInMessage={
          dineInData.availability.available
            ? undefined
            : dineInData.availability.message
        }
        carHref={carHref}
      />

      <SocialLinks className="mt-6 pt-2" />
    </main>
  );
}
