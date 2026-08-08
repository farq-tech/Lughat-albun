"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CUSTOMER_PRESENCE_LABELS,
  type CustomerPresence,
} from "@/domains/orders/customer-presence";
import { customerStatusCopy } from "@/domains/orders/state-machine";
import {
  LOCATION_HINTS,
  formatVehicleLabel,
} from "@/domains/vehicles/validation";
import { createClient } from "@/lib/supabase/client";
import { formatSar } from "@/lib/money";
import {
  customerPresenceAction,
  locationHintAction,
} from "@/server/actions/orders";
import { Button } from "@/components/ui/button";
import type { OrderRecord } from "@/types/database";

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

function normalizePresence(order: OrderRecord): CustomerPresence {
  const value = order.customer_presence;
  if (
    value === "on_the_way" ||
    value === "outside" ||
    value === "claimed_received"
  ) {
    return value;
  }
  if (order.status === "CUSTOMER_ARRIVED" || order.status === "OUT_FOR_DELIVERY") {
    return "outside";
  }
  if (order.customer_on_the_way) return "on_the_way";
  return "none";
}

export function OrderTracker({
  initial,
  publicOrderNumber,
  accessToken,
}: OrderTrackerProps) {
  const router = useRouter();
  const data = initial;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customHint, setCustomHint] = useState("");
  const [locationHint, setLocationHint] = useState("");

  const { order } = data;
  const copy = customerStatusCopy(order.status);
  const presence = normalizePresence(order);

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

  const showPresenceActions = order.status === "READY";
  const showLocationHelp =
    order.location_help_requested &&
    (presence === "outside" || order.status === "CUSTOMER_ARRIVED");

  const setPresence = (
    next: "on_the_way" | "outside" | "claimed_received",
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await customerPresenceAction({
        publicOrderNumber,
        accessToken,
        presence: next,
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
        {presence !== "none" && order.status === "READY" && (
          <p className="mt-4 text-sm font-medium text-[var(--success)]">
            حدّثت حالتك: {CUSTOMER_PRESENCE_LABELS[presence]}
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

      {showPresenceActions && (
        <div className="mt-8 space-y-3 animate-fade-up stagger-3">
          <p className="text-center text-sm text-[var(--ink-muted)]">
            وين وصلت؟
          </p>
          <Button
            type="button"
            size="lg"
            variant={presence === "on_the_way" ? "primary" : "secondary"}
            className="w-full"
            disabled={pending}
            onClick={() => setPresence("on_the_way")}
          >
            بالطريق
          </Button>
          <Button
            type="button"
            size="lg"
            variant={presence === "outside" ? "primary" : "secondary"}
            className="w-full"
            disabled={pending}
            onClick={() => setPresence("outside")}
          >
            أنا برا
          </Button>
          <Button
            type="button"
            size="lg"
            variant={presence === "claimed_received" ? "primary" : "secondary"}
            className="w-full"
            disabled={pending}
            onClick={() => setPresence("claimed_received")}
          >
            تم الاستلام
          </Button>
          {presence === "outside" && (
            <p className="text-center text-sm text-[var(--accent)]">
              شغّل الفلشر عشان الموظف يلقاك أسرع
            </p>
          )}
        </div>
      )}

      {showLocationHelp && (
        <section className="mt-8 space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-5 animate-fade-up">
          <div>
            <h2 className="font-semibold">ساعدنا نلقاك</h2>
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

      {error && (
        <p
          className="mt-6 rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      )}

      <section className="mt-10 animate-fade-up">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink-muted)]">
          الطلب
        </h2>
        <ul className="space-y-2">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/40 px-4 py-3 text-sm"
            >
              <span>
                {item.quantity}× {item.product_name_snapshot}
              </span>
              <span className="text-[var(--ink-muted)]">
                {formatSar(item.line_total_minor)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-left text-sm font-semibold" dir="ltr">
          {formatSar(order.total_minor)}
        </p>
      </section>
    </div>
  );
}
