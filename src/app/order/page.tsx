import Image from "next/image";
import { SocialLinks } from "@/components/brand/social-links";
import { Button } from "@/components/ui/button";
import { getStoreAvailability } from "@/server/services/store";

type PageProps = {
  searchParams: Promise<{ source?: string }>;
};

function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-4 animate-fade-up">
      <Image
        src="/brand/lughat-albun-logo-circle.png"
        alt="لغة البن"
        width={160}
        height={160}
        priority
        className="size-36 rounded-full object-cover shadow-sm sm:size-40"
      />
      <div className="flex flex-col items-center gap-1">
        <span className="font-display text-[2.75rem] leading-none tracking-tight text-[var(--ink)] sm:text-5xl">
          لغة البن
        </span>
        <span className="text-xs font-semibold tracking-[0.22em] text-[var(--accent)] uppercase">
          Lughat Al-Bun Café
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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-7 pb-10 pt-12">
      <header className="flex flex-col items-center text-center">
        <BrandMark />
        {!canOrder ? (
          <p
            className="mt-6 text-sm font-medium text-[var(--accent)] animate-fade-up stagger-1"
            aria-live="polite"
          >
            {availability.message}
          </p>
        ) : null}
      </header>

      <section className="mt-10 flex flex-1 flex-col items-center text-center animate-fade-up stagger-2">
        <h1 className="font-display text-3xl leading-snug text-[var(--ink)] sm:text-4xl">
          قهوتك توصلك لسيارتك.
        </h1>
        {store ? (
          <p className="mt-6 text-sm text-[var(--ink-muted)]">{store.name_ar}</p>
        ) : null}
      </section>

      <footer className="mt-auto space-y-3 pt-10 animate-fade-up stagger-3">
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

        <p className="text-center text-sm text-[var(--ink-muted)]">
          طلب واستلام من السيارة
        </p>
        <SocialLinks className="pt-2" />
      </footer>
    </main>
  );
}
