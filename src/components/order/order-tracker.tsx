"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CUSTOMER_PRESENCE_LABELS,
  PRESENCE_ALLOWED_ORDER_STATUSES,
  nextPresenceActions,
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
import { ArrivalBadge, PaymentBadge } from "@/components/ui/badge";
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

  const presenceAllowed = (
    PRESENCE_ALLOWED_ORDER_STATUSES as readonly string[]
  ).includes(order.status);
  const availablePresenceActions = presenceAllowed
    ? nextPresenceActions(presence).filter((action) =>
        action === "claimed_received" ? order.status === "READY" : true,
      )
    : [];
  const showPresenceActions = availablePresenceActions.length > 0;
  const showLocationHelp =
    order.location_help_requested &&
    (presence === "outside" || order.status === "CUSTOMER_ARRIVED");

  const setPresence = (
    next: "on_the_way" | "outside" | "claimed_received",
  ) => {
    if (pending) return;
    if (!availablePresenceActions.includes(next)) return;
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

  const isReady = order.status === "READY";
  const isDelivered = order.status === "DELIVERED";

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-5 pb-12 pt-10">
      <header className="mb-8 animate-fade-up">
        <p className="font-display text-lg text-[var(--ink-muted)]">لغات البن</p>
        <h1 className="mt-1 font-display text-3xl text-[var(--ink)]">
          طلبك #{order.public_order_number}
        </h1>
      </header>

      <section
        className={`ui-panel-soft space-y-2 p-5 animate-fade-up stagger-1 ${
          isReady ? "animate-pulse-soft border-[var(--success)]/40" : ""
        }`}
      >
        <p className="text-xs font-medium text-[var(--ink-muted)]">حالة المطبخ</p>
        <h2
          className={`font-display text-2xl ${
            isReady || isDelivered
              ? "text-[var(--success)]"
              : "text-[var(--ink)]"
          }`}
        >
          {copy.title}
        </h2>
        <p className="text-[var(--ink-muted)]">{copy.body}</p>
        {estimateText && !isDelivered ? (
          <p className="pt-1 text-sm font-medium text-[var(--accent)]">
            الوقت المتوقع: {estimateText}
          </p>
        ) : null}
      </section>

      {presenceAllowed ? (
        <section
          className={`ui-panel mt-4 space-y-3 p-5 animate-fade-up stagger-2 ${
            presence === "outside"
              ? "border-[var(--accent)] shadow-[inset_-3px_0_0_0_var(--accent)]"
              : ""
          }`}
        >
          <p className="text-xs font-medium text-[var(--ink-muted)]">وصولك</p>
          <ArrivalBadge presence={presence} />
          {presence === "outside" ? (
            <p className="text-sm text-[var(--ink-muted)]">
              شغّل الفلشر عشان الموظف يلقاك أسرع
            </p>
          ) : null}
        </section>
      ) : null}

      {(vehicleLabel || order.payment_method) && (
        <section className="ui-panel-soft mt-4 space-y-3 p-4 animate-fade-up stagger-2">
          {vehicleLabel ? (
            <div>
              <p className="text-sm text-[var(--ink-muted)]">سيارتك</p>
              <p className="mt-1 font-semibold">
                {vehicleLabel}
                {order.plate_hint_snapshot
                  ? ` · لوحة • ${order.plate_hint_snapshot}`
                  : ""}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <PaymentBadge
              paymentMethod={order.payment_method}
              paymentStatus={order.payment_status}
            />
            <span className="text-sm font-semibold" dir="ltr">
              {formatSar(order.total_minor)}
            </span>
          </div>
        </section>
      )}

      {showPresenceActions ? (
        <div className="mt-8 space-y-3 animate-fade-up stagger-3">
          {availablePresenceActions.includes("on_the_way") ? (
            <Button
              type="button"
              size="lg"
              variant="primary"
              className="w-full"
              disabled={pending}
              onClick={() => setPresence("on_the_way")}
            >
              أنا بالطريق
            </Button>
          ) : null}
          {availablePresenceActions.includes("outside") ? (
            <Button
              type="button"
              size="lg"
              variant={
                availablePresenceActions.includes("on_the_way")
                  ? "secondary"
                  : "primary"
              }
              className="w-full"
              disabled={pending}
              onClick={() => setPresence("outside")}
            >
              أنا برا
            </Button>
          ) : null}
          {availablePresenceActions.includes("claimed_received") ? (
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="w-full"
              disabled={pending}
              onClick={() => setPresence("claimed_received")}
            >
              تم الاستلام
            </Button>
          ) : null}
        </div>
      ) : null}

      {isDelivered ? (
        <p className="mt-8 text-center font-display text-2xl text-[var(--ink)] animate-fade-up">
          بالعافية
        </p>
      ) : null}

      {showLocationHelp ? (
        <section className="ui-panel-soft mt-8 space-y-4 p-5 animate-fade-up">
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
                  className="ui-input min-w-0 flex-1 text-sm"
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
      ) : null}

      {error ? (
        <p
          className="mt-6 rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="mt-10 animate-fade-up">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink-muted)]">
          الطلب
        </h2>
        <ul className="space-y-2">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="ui-panel flex items-center justify-between px-4 py-3 text-sm"
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
        {presenceAllowed ? (
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            الوصول: {CUSTOMER_PRESENCE_LABELS[presence]}
          </p>
        ) : null}
      </section>
    </div>
  );
}
