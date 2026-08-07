import { Button } from "@/components/ui/button";
import { getStoreAvailability } from "@/server/services/store";

type PageProps = {
  searchParams: Promise<{ source?: string }>;
};

function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-1 animate-fade-up">
      <span
        className="font-display text-[2.75rem] leading-none tracking-tight text-[var(--ink)] sm:text-5xl"
        aria-hidden
      >
        لغة البن
      </span>
      <span className="text-xs font-medium tracking-[0.2em] text-[var(--ink-muted)] uppercase">
        Lughat Albun Café
      </span>
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
  const { source } = await searchParams;
  const orderSource = source === "qr" ? "qr" : "link";

  let availabilityData: Awaited<ReturnType<typeof getStoreAvailability>> | null =
    null;

  try {
    availabilityData = await getStoreAvailability();
  } catch {
    return <SystemPreparing />;
  }

  const { availability, store } = availabilityData;
  const canOrder = availability.available;
  const menuHref = `/order/menu?source=${orderSource}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-10 pt-14">
      <header className="flex flex-col items-center text-center">
        <BrandMark />
        <p
          className="mt-8 text-sm font-medium text-[var(--accent)] animate-fade-up stagger-1"
          aria-live="polite"
        >
          {availability.message}
        </p>
      </header>

      <section className="mt-12 flex flex-1 flex-col items-center text-center animate-fade-up stagger-2">
        <h1 className="font-display text-3xl leading-snug text-[var(--ink)] sm:text-4xl">
          قهوتك تجيك لسيارتك
        </h1>
        <p className="mt-4 max-w-xs text-base leading-relaxed text-[var(--ink-muted)]">
          اطلب من مكانك وخلك بالسيارة
        </p>

        {store && (
          <p className="mt-6 text-sm text-[var(--ink-muted)]">{store.name_ar}</p>
        )}
      </section>

      <footer className="mt-auto space-y-4 pt-10 animate-fade-up stagger-3">
        {canOrder ? (
          <Button asLink href={menuHref} size="lg" className="w-full">
            ابدأ الطلب
          </Button>
        ) : (
          <>
            <Button disabled size="lg" className="w-full">
              ابدأ الطلب
            </Button>
            <p className="text-center text-sm text-[var(--ink-muted)]">
              {availability.message}
            </p>
          </>
        )}

        <p className="text-center text-xs text-[var(--ink-muted)]">
          🚗 استلام من السيارة فقط
        </p>
      </footer>
    </main>
  );
}
