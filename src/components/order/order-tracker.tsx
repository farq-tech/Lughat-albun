"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { customerStatusCopy } from "@/domains/orders/state-machine";
import {
  LOCATION_HINTS,
  formatVehicleLabel,
} from "@/domains/vehicles/validation";
import { createClient } from "@/lib/supabase/client";
import { formatSar } from "@/lib/money";
import {
  arrivedAction,
  locationHintAction,
  onMyWayAction,
} from "@/server/actions/orders";
import { Button } from "@/components/ui/button";
import type { OrderRecord, OrderStatus } from "@/types/database";

type OrderData = {
  order: OrderRecord;
  items: Array<{
    id: string;
    product_name_snapshot: string;
    quantity: number;
    line_total_minor: number;
  }>;
};

type OrderTrackerProps = {
  initial: OrderData;
  publicOrderNumber: number;
  accessToken: string;
};

export function OrderTracker({
  initial,
  publicOrderNumber,
  accessToken,
}: OrderTrackerProps) {
  const router = useRouter();
  // Prefer server-refreshed props as source of truth after realtime refetch
  const data = initial;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [confirmVehicle, setConfirmVehicle] = useState(true);
  const [locationHint, setLocationHint] = useState("");
  const [customHint, setCustomHint] = useState("");

  const { order } = data;
  const copy = customerStatusCopy(order.status);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [order.id, refresh]);

  const vehicleLabel =
    order.car_make_model_snapshot && order.car_color_snapshot
      ? formatVehicleLabel(
          order.car_make_model_snapshot,
          order.car_color_snapshot,
        )
      : null;

  const showOnMyWay = canShowOnMyWay(order.status);
  const showArrived = order.status === "READY";
  const showFlasher =
    order.status === "READY" ||
    order.status === "CUSTOMER_ARRIVED" ||
    order.status === "OUT_FOR_DELIVERY";
  const showLocationHelp = order.location_help_requested;

  const handleOnMyWay = () => {
    setError(null);
    startTransition(async () => {
      const result = await onMyWayAction({ publicOrderNumber, accessToken });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      refresh();
    });
  };

  const handleArrivedClick = () => {
    setVehicleDialogOpen(true);
  };

  const handleArrivedConfirm = () => {
    setError(null);
    setVehicleDialogOpen(false);
    startTransition(async () => {
      const result = await arrivedAction({
        publicOrderNumber,
        accessToken,
        confirmVehicle,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      refresh();
    });
  };

  const handleLocationHint = (hint: string) => {
    setError(null);
    startTransition(async () => {
      const result = await locationHintAction({
        publicOrderNumber,
        accessToken,
        locationHint: hint,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setLocationHint(hint);
      refresh();
    });
  };

  const estimateText =
    order.estimated_prep_min != null && order.estimated_prep_max != null
      ? `${order.estimated_prep_min}–${order.estimated_prep_max} دقيقة`
      : null;

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-5 pb-12 pt-10">
      <header className="mb-8 text-center animate-fade-up">
        <p className="font-display text-xl text-[var(--ink)]">لغة البن</p>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          طلب #{order.public_order_number}
        </p>
      </header>

      <section
        className={`rounded-3xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-6 text-center animate-fade-up stagger-1 ${
          order.status === "READY" ? "animate-pulse-soft" : ""
        }`}
      >
        <h1 className="font-display text-2xl text-[var(--ink)]">{copy.title}</h1>
        <p className="mt-3 text-[var(--ink-muted)]">{copy.body}</p>
        {estimateText && order.status !== "DELIVERED" && (
          <p className="mt-4 text-sm font-medium text-[var(--accent)]">
            الوقت المتوقع: {estimateText}
          </p>
        )}
      </section>

      {vehicleLabel && (
        <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white/50 p-4 animate-fade-up stagger-2">
          <p className="text-sm text-[var(--ink-muted)]">سيارتك</p>
          <p className="mt-1 font-semibold">{vehicleLabel}</p>
          {order.plate_hint_snapshot && (
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              آخر {order.plate_hint_snapshot} من اللوحة
            </p>
          )}
        </section>
      )}

      {showFlasher && (
        <section className="mt-6 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 animate-fade-up">
          <p className="font-semibold text-[var(--accent)]">
            شغّل الفلشر 🚗
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            عشان نعرف مكانك بسرعة
          </p>
        </section>
      )}

      {order.customer_on_the_way && !showArrived && (
        <p className="mt-4 text-center text-sm text-[var(--success)]">
          سجلنا إنك بالطريق ✓
        </p>
      )}

      <div className="mt-8 space-y-3 animate-fade-up stagger-3">
        {showOnMyWay && !order.customer_on_the_way && (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="w-full"
            disabled={pending}
            onClick={handleOnMyWay}
          >
            أنا بالطريق
          </Button>
        )}

        {showArrived && (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={handleArrivedClick}
          >
            وصلت
          </Button>
        )}
      </div>

      {showLocationHelp && (
        <section className="mt-8 space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-5 animate-fade-up">
          <div>
            <h2 className="font-semibold">وين مكانك؟</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              الموظف يحتاج يساعدك يلقاك
            </p>
          </div>
          {locationHint || order.location_hint ? (
            <p className="text-sm text-[var(--success)]">
              تم إرسال موقعك: {locationHint || order.location_hint}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {LOCATION_HINTS.map((hint) => (
                  <Button
                    key={hint.id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleLocationHint(hint.label)}
                  >
                    {hint.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customHint}
                  onChange={(e) => setCustomHint(e.target.value)}
                  placeholder="وصف مختصر..."
                  maxLength={120}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || customHint.trim().length < 2}
                  onClick={() => handleLocationHint(customHint.trim())}
                >
                  إرسال
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="mt-10 animate-fade-up">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink-muted)]">
          تفاصيل الطلب
        </h2>
        <ul className="space-y-2">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <span>
                {item.product_name_snapshot} × {item.quantity}
              </span>
              <span className="text-[var(--ink-muted)]">
                {formatSar(item.line_total_minor)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-4 font-semibold">
          <span>الإجمالي</span>
          <span className="text-[var(--accent)]">
            {formatSar(order.total_minor)}
          </span>
        </div>
      </section>

      {error && (
        <p
          className="mt-6 rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      )}

      {vehicleDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold">تأكيد سيارتك</h2>
            {vehicleLabel ? (
              <p className="mt-3 text-[var(--ink-muted)]">{vehicleLabel}</p>
            ) : (
              <p className="mt-3 text-[var(--ink-muted)]">
                تأكد إنك بالسيارة الصح
              </p>
            )}
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmVehicle}
                onChange={(e) => setConfirmVehicle(e.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              <span>هذي سيارتي</span>
            </label>
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setVehicleDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={pending}
                onClick={handleArrivedConfirm}
              >
                وصلت
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function canShowOnMyWay(status: OrderStatus): boolean {
  return ["PAID", "ACCEPTED", "PREPARING", "READY"].includes(status);
}
