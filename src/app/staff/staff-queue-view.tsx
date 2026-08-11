"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/staff/language-switcher";
import { ArrivalBadge, KitchenBadge, PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerPresence } from "@/domains/orders/customer-presence";
import {
  actionLabelForNext,
  formatStaffWait,
  presenceLabel,
  staffErrorMessage,
  statusLabel,
  useStaffI18n,
} from "@/lib/staff-i18n";
import { formatSar } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import {
  getStaffQueueAction,
  staffTransitionAction,
} from "@/server/actions/staff";
import type { OrderStatus } from "@/types/database";
import type { StaffQueueOrder } from "@/types/staff-queue";

type SectionKey = "new" | "preparing" | "ready" | "legacy";

const SECTION_STATUSES: Record<SectionKey, OrderStatus[]> = {
  new: ["PAID"],
  preparing: ["ACCEPTED", "PREPARING"],
  ready: ["READY"],
  legacy: ["CUSTOMER_ARRIVED", "OUT_FOR_DELIVERY"],
};

const SECTION_ORDER: SectionKey[] = ["new", "preparing", "ready", "legacy"];

function presenceOf(order: StaffQueueOrder): CustomerPresence {
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

function elapsedMinutes(from: string | null): number {
  if (!from) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60_000));
}

function playAlert() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 660;
      gain2.gain.value = 0.15;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.25);
    }, 280);
  } catch {
    // Audio unavailable
  }
}

type StaffQueueViewProps = {
  initialOrders: StaffQueueOrder[];
};

export function StaffQueueView({ initialOrders }: StaffQueueViewProps) {
  const router = useRouter();
  const { t } = useStaffI18n();
  const [orders, setOrders] = useState(initialOrders);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const knownIdsRef = useRef(new Set(initialOrders.map((o) => o.id)));
  const arrivedIdsRef = useRef(
    new Set(
      initialOrders
        .filter(
          (o) =>
            o.status === "CUSTOMER_ARRIVED" ||
            o.customer_presence === "outside" ||
            o.customer_presence === "claimed_received",
        )
        .map((o) => o.id),
    ),
  );

  const sectionTitles = useMemo(
    () => ({
      new: t.queue.sectionNew,
      preparing: t.queue.sectionPreparing,
      ready: t.queue.sectionReady,
      legacy: t.queue.sectionLegacy,
    }),
    [t],
  );

  const refetch = useCallback(async () => {
    const result = await getStaffQueueAction();
    if (!result.ok) {
      if (result.code === "UNAUTHORIZED" || result.code === "FORBIDDEN") {
        router.push("/staff/login");
      }
      return;
    }

    if (soundEnabled) {
      for (const o of result.data) {
        if (!knownIdsRef.current.has(o.id) && o.status === "PAID") {
          playAlert();
        }
        const outsideNow =
          o.customer_presence === "outside" ||
          o.customer_presence === "claimed_received" ||
          o.status === "CUSTOMER_ARRIVED";
        if (outsideNow && !arrivedIdsRef.current.has(o.id)) {
          playAlert();
        }
      }
    }

    for (const o of result.data) {
      knownIdsRef.current.add(o.id);
      if (
        o.customer_presence === "outside" ||
        o.customer_presence === "claimed_received" ||
        o.status === "CUSTOMER_ARRIVED"
      ) {
        arrivedIdsRef.current.add(o.id);
      }
    }

    setOrders(result.data);
  }, [router, soundEnabled]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("staff-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void refetch();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refetch();
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  useEffect(() => {
    const id = setInterval(() => setOrders((prev) => [...prev]), 30_000);
    return () => clearInterval(id);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<SectionKey, StaffQueueOrder[]>();
    for (const key of SECTION_ORDER) map.set(key, []);
    for (const o of orders) {
      const section = SECTION_ORDER.find((key) =>
        SECTION_STATUSES[key].includes(o.status),
      );
      if (section) map.get(section)!.push(o);
    }
    const ready = map.get("ready");
    if (ready) {
      ready.sort((a, b) => {
        const pa = presenceOf(a);
        const pb = presenceOf(b);
        const rank = (p: CustomerPresence) =>
          p === "claimed_received" || p === "outside"
            ? 0
            : p === "on_the_way"
              ? 1
              : 2;
        const diff = rank(pa) - rank(pb);
        if (diff !== 0) return diff;
        const ta =
          a.customer_presence_updated_at ??
          a.customer_arrived_at ??
          a.paid_at ??
          a.created_at;
        const tb =
          b.customer_presence_updated_at ??
          b.customer_arrived_at ??
          b.paid_at ??
          b.created_at;
        return new Date(ta).getTime() - new Date(tb).getTime();
      });
    }
    return map;
  }, [orders]);

  async function handleAction(order: StaffQueueOrder) {
    if (!order.primaryAction) return;
    setBusyId(order.id);
    setActionError(null);
    const result = await staffTransitionAction({
      orderId: order.id,
      toStatus: order.primaryAction.next,
    });
    setBusyId(null);
    if (result.ok) {
      await refetch();
      return;
    }
    setActionError(staffErrorMessage(result.code, result.message, t.errors));
  }

  function enableSound() {
    playAlert();
    setSoundEnabled(true);
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl p-4 pb-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{t.queue.title}</h1>
          <p className="text-sm text-[var(--ink-muted)]">{t.queue.live}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSwitcher compact />
          <button
            type="button"
            onClick={() => (soundEnabled ? setSoundEnabled(false) : enableSound())}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              soundEnabled
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-muted)]"
            }`}
          >
            {soundEnabled ? t.queue.soundOn : t.queue.soundOff}
          </button>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            {t.queue.refresh}
          </Button>
        </div>
      </header>

      {actionError ? (
        <p
          className="mb-4 rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {t.queue.updateFailed} — {actionError}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        {SECTION_ORDER.map((sectionKey) => {
          const items = grouped.get(sectionKey) ?? [];
          const highlightReady = sectionKey === "ready";
          const sampleStatus = SECTION_STATUSES[sectionKey][0];

          return (
            <section
              key={sectionKey}
              className={`rounded-2xl border p-3 ${
                highlightReady
                  ? "border-[var(--success)]/35 bg-[var(--success)]/5"
                  : "border-[var(--line)] bg-[var(--surface-2)]/60"
              }`}
            >
              <h2 className="mb-3 flex items-center justify-between gap-2 text-lg font-bold">
                <span className="flex items-center gap-2">
                  {sampleStatus ? (
                    <KitchenBadge
                      status={sampleStatus}
                      label={statusLabel(sampleStatus, t.status)}
                    />
                  ) : null}
                  <span>{sectionTitles[sectionKey]}</span>
                </span>
                <span className="rounded-lg bg-[var(--surface-3)] px-2 py-0.5 text-sm font-normal text-[var(--ink-muted)]">
                  {items.length}
                </span>
              </h2>

              <ul className="space-y-3">
                {items.length === 0 ? (
                  <li className="py-8 text-center text-sm text-[var(--ink-muted)]">
                    {t.queue.empty}
                  </li>
                ) : (
                  items.map((order) => {
                    const presence = presenceOf(order);
                    const priority =
                      presence === "outside" ||
                      presence === "claimed_received";
                    return (
                      <OrderCard
                        key={order.id}
                        order={order}
                        presence={presence}
                        busy={busyId === order.id}
                        onAction={() => void handleAction(order)}
                        priority={priority}
                      />
                    );
                  })
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  presence,
  busy,
  onAction,
  priority,
}: {
  order: StaffQueueOrder;
  presence: CustomerPresence;
  busy: boolean;
  onAction: () => void;
  priority: boolean;
}) {
  const { t } = useStaffI18n();
  const waitFrom = order.paid_at ?? order.created_at;
  const waitMin = elapsedMinutes(waitFrom);
  const presenceSince =
    presence === "outside" || presence === "claimed_received"
      ? elapsedMinutes(
          order.customer_presence_updated_at ?? order.customer_arrived_at,
        )
      : presence === "on_the_way"
        ? elapsedMinutes(order.customer_presence_updated_at ?? order.on_my_way_at)
        : 0;

  return (
    <li
      className={`rounded-xl border bg-[var(--elevated)] p-3 ${
        priority
          ? "border-[var(--accent)] shadow-[inset_-3px_0_0_0_var(--accent)]"
          : "border-[var(--line)]"
      }`}
    >
      <Link href={`/staff/orders/${order.id}`} className="block">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-xl font-bold">#{order.public_order_number}</span>
          <span className="text-xs text-[var(--ink-muted)]">
            {formatStaffWait(waitMin, t.wait)}
          </span>
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {(order.order_type ?? "CURBSIDE") === "DINE_IN" ? (
            <span className="rounded-lg bg-[var(--surface-3)] px-2 py-0.5 text-xs font-medium">
              {t.queue.dineIn} · {t.queue.table}{" "}
              {order.table_number_snapshot ?? "—"}
            </span>
          ) : (
            <>
              <ArrivalBadge
                presence={presence}
                label={presenceLabel(presence, t.presence)}
              />
              {presenceSince > 0 && presence !== "none" ? (
                <span className="text-xs text-[var(--ink-muted)]">
                  {t.queue.since} {formatStaffWait(presenceSince, t.wait)}
                </span>
              ) : null}
            </>
          )}
        </div>

        {(order.order_type ?? "CURBSIDE") === "DINE_IN" ? (
          <p className="text-sm font-semibold text-[var(--ink)]">
            {t.queue.table} {order.table_number_snapshot ?? "—"}
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-[var(--ink)]">
              {order.car_make_model_snapshot ?? "—"}
              {order.car_color_snapshot ? ` · ${order.car_color_snapshot}` : ""}
            </p>
            {order.plate_hint_snapshot ? (
              <p className="text-xs text-[var(--ink-muted)]">
                {t.queue.plate} • {order.plate_hint_snapshot}
              </p>
            ) : null}
          </>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-muted)]">
          <span>
            {order.itemCount} {t.queue.items}
          </span>
          <span>{formatSar(order.total_minor)}</span>
          <PaymentBadge
            paymentMethod={order.payment_method}
            paymentStatus={order.payment_status}
            labels={t.payment}
          />
        </div>
      </Link>

      {order.primaryAction ? (
        <Button
          className="mt-3 w-full"
          size="sm"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            onAction();
          }}
        >
          {busy
            ? "…"
            : actionLabelForNext(order.primaryAction.next, t.actions)}
        </Button>
      ) : null}
    </li>
  );
}
