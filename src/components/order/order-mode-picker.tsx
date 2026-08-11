"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, ScanLine } from "lucide-react";

type OrderModePickerProps = {
  carAvailable: boolean;
  dineInAvailable: boolean;
  carMessage?: string;
  dineInMessage?: string;
  carHref: string;
};

export function OrderModePicker({
  carAvailable,
  dineInAvailable,
  carMessage,
  dineInMessage,
  carHref,
}: OrderModePickerProps) {
  const router = useRouter();

  return (
    <div className="mt-auto w-full space-y-3 pt-10 animate-fade-up stagger-3">
      <p className="text-center text-sm font-medium text-[var(--ink-muted)]">
        كيف تبي تطلب؟
      </p>

      <button
        type="button"
        disabled={!dineInAvailable}
        onClick={() => router.push("/order/scan")}
        className="group flex w-full items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--elevated)] px-5 py-5 text-start shadow-sm transition hover:border-[var(--accent)] disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/12 text-[var(--accent)] transition group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)]">
          <ScanLine className="size-7" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl font-bold text-[var(--ink)]">
            طلبات الطاولات
          </span>
          <span className="mt-0.5 block text-sm text-[var(--ink-muted)]">
            امسح QR الطاولة — نجهّز ونوصّل لطاولةك
          </span>
          {!dineInAvailable && dineInMessage ? (
            <span className="mt-1 block text-xs font-medium text-[var(--accent)]">
              {dineInMessage}
            </span>
          ) : null}
        </span>
      </button>

      {carAvailable ? (
        <Link
          href={carHref}
          className="group flex w-full items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--elevated)] px-5 py-5 text-start shadow-sm transition hover:border-[var(--accent)]"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-3)] text-[var(--ink)] transition group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)]">
            <Car className="size-7" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-2xl font-bold text-[var(--ink)]">
              من السيارة
            </span>
            <span className="mt-0.5 block text-sm text-[var(--ink-muted)]">
              اطلب وخلك بمكانك — نوصّل للسيارة
            </span>
          </span>
        </Link>
      ) : (
        <div className="flex w-full items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/60 px-5 py-5 opacity-60">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-3)]">
            <Car className="size-7" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-2xl font-bold">من السيارة</span>
            <span className="mt-0.5 block text-sm text-[var(--ink-muted)]">
              {carMessage ?? "خدمة السيارة غير متاحة الآن"}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
