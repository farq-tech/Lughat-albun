"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/staff/language-switcher";
import { ArrivalBadge, PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerPresence } from "@/domains/orders/customer-presence";
import {
  actionLabelForNext,
  formatStaffWait,
  presenceLabel,
  staffErrorMessage,
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

type SectionKey = "ready" | "new" | "preparing" | "legacy";

/** Ready / handoff first — that's what blocks customers. */
const SECTION_STATUSES: Record<SectionKey, OrderStatus[]> = {
  ready: ["READY"],
  new: ["PAID"],
  preparing: ["ACCEPTED", "PREPARING"],
  legacy: ["CUSTOMER_ARRIVED", "OUT_FOR_DELIVERY"],
};

const SECTION_ORDER: SectionKey[] = ["ready", "new", "preparing", "legacy"];

const STALE_READY_MINUTES = 45;

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

function isDineIn(order: StaffQueueOrder) {
  return (order.order_type ?? "CURBSIDE") === "DINE_IN";
}

function elapsedMinutes(from: string | null): number {
  if (!from) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60_000));
}

function waitMinutes(order: StaffQueueOrder) {
  return elapsedMinutes(order.paid_at ?? order.created_at);
}

function waitTone(minutes: number): "ok" | "warn" | "hot" {
  if (minutes >= 15) return "hot";
  if (minutes >= 8) return "warn";
  return "ok";
}

/** Lower score = more urgent for staff. */
function urgencyScore(order: StaffQueueOrder): number {
  const presence = presenceOf(order);
  const wait = waitMinutes(order);
  if (presence === "outside" || presence === "claimed_received") return 0 + wait / 1000;
  if (order.status === "CUSTOMER_ARRIVED" || order.status === "OUT_FOR_DELIVERY") {
    return 1 + wait / 1000;
  }
  if (order.status === "READY") return 10 + wait / 100;
  if (order.status === "PAID") return 20 + wait / 100;
  if (order.status === "PREPARING" || order.status === "ACCEPTED") return 30 + wait / 100;
  return 50;
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

function identityLabel(order: StaffQueueOrder, t: ReturnType<typeof useStaffI18n>["t"]) {
  if (isDineIn(order)) {
    return `${t.queue.table} ${order.table_number_snapshot ?? "—"}`;
  }
  const car = [order.car_make_model_snapshot, order.car_color_snapshot]
    .filter(Boolean)
    .join(" · ");
  return car || t.queue.curbside;
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
  const [userTab, setUserTab] = useState<SectionKey | null>(null);
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
      ready: t.queue.sectionReady,
      new: t.queue.sectionNew,
      preparing: t.queue.sectionPreparing,
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
    for (const key of SECTION_ORDER) {
      map.get(key)!.sort((a, b) => urgencyScore(a) - urgencyScore(b));
    }
    return map;
  }, [orders]);

  const needsAttention = useMemo(() => {
    return orders
      .filter((o) => {
        const p = presenceOf(o);
        return (
          p === "outside" ||
          p === "claimed_received" ||
          o.status === "CUSTOMER_ARRIVED" ||
          o.status === "OUT_FOR_DELIVERY"
        );
      })
      .sort((a, b) => urgencyScore(a) - urgencyScore(b));
  }, [orders]);

  const preferredTab = useMemo<SectionKey>(() => {
    for (const key of SECTION_ORDER) {
      if ((grouped.get(key)?.length ?? 0) > 0) return key;
    }
    return "ready";
  }, [grouped]);

  const activeTab = userTab ?? preferredTab;

  const nextUp = useMemo(() => {
    if (orders.length === 0) return null;
    return [...orders].sort((a, b) => urgencyScore(a) - urgencyScore(b))[0] ?? null;
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

  function selectTab(key: SectionKey) {
    setUserTab(key);
  }

  const mobileItems = grouped.get(activeTab) ?? [];

  return (
    <div className="mx-auto min-h-dvh max-w-7xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--parchment-from)]/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display truncate text-xl font-bold leading-tight sm:text-2xl">
              {t.queue.title}
            </h1>
            <p className="truncate text-xs text-[var(--ink-muted)] sm:text-sm">
              {t.queue.live} · {orders.length}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher compact />
            <button
              type="button"
              onClick={() =>
                soundEnabled ? setSoundEnabled(false) : enableSound()
              }
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                soundEnabled
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--line)] bg-[var(--elevated)] text-[var(--ink-muted)]"
              }`}
              aria-pressed={soundEnabled}
              title={soundEnabled ? t.queue.soundOn : t.queue.soundOff}
            >
              {soundEnabled ? t.queue.soundOn : t.queue.soundOff}
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-10 px-3"
              onClick={() => void refetch()}
            >
              {t.queue.refresh}
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-4">
        {actionError ? (
          <p
            className="rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
            role="alert"
          >
            {t.queue.updateFailed} — {actionError}
          </p>
        ) : null}

        {needsAttention.length > 0 ? (
          <section
            className="animate-pulse-soft rounded-2xl border-2 border-[var(--accent)] bg-[var(--accent)]/10 p-3"
            aria-live="polite"
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
              {t.queue.needsYou} · {needsAttention.length}
            </p>
            <ul className="space-y-2">
              {needsAttention.slice(0, 3).map((order) => (
                <li key={order.id}>
                  <AttentionRow
                    order={order}
                    busy={busyId === order.id}
                    onAction={() => void handleAction(order)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {nextUp && needsAttention[0]?.id !== nextUp.id ? (
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-3 shadow-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
              {t.queue.nextUp}
            </p>
            <OrderCard
              order={nextUp}
              presence={presenceOf(nextUp)}
              busy={busyId === nextUp.id}
              onAction={() => void handleAction(nextUp)}
              priority
              featured
            />
          </section>
        ) : null}

        {orders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] py-16 text-center text-[var(--ink-muted)]">
            {t.queue.allClear}
          </p>
        ) : null}

        {/* Mobile: one stage at a time */}
        <div className="lg:hidden">
          <div
            className="mb-3 flex gap-1.5 overflow-x-auto pb-1"
            role="tablist"
            aria-label={t.queue.title}
          >
            {SECTION_ORDER.map((key) => {
              const count = grouped.get(key)?.length ?? 0;
              const selected = activeTab === key;
              const hot = key === "ready" && count > 0;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectTab(key)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
                    selected
                      ? hot
                        ? "bg-[var(--success)] text-white"
                        : "bg-[var(--ink)] text-[var(--accent-fg)]"
                      : "border border-[var(--line)] bg-[var(--elevated)] text-[var(--ink)]"
                  }`}
                >
                  {sectionTitles[key]}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
                      selected
                        ? "bg-white/20"
                        : count > 0
                          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                          : "bg-[var(--surface-3)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <ul className="space-y-3" role="tabpanel">
            {mobileItems.length === 0 ? (
              <li className="py-12 text-center text-sm text-[var(--ink-muted)]">
                {t.queue.empty}
              </li>
            ) : (
              mobileItems.map((order) => {
                const presence = presenceOf(order);
                const priority =
                  presence === "outside" || presence === "claimed_received";
                return (
                  <li key={order.id}>
                    <OrderCard
                      order={order}
                      presence={presence}
                      busy={busyId === order.id}
                      onAction={() => void handleAction(order)}
                      priority={priority}
                    />
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Desktop: columns, Ready first */}
        <div className="hidden gap-4 lg:grid lg:grid-cols-4">
          {SECTION_ORDER.map((sectionKey) => {
            const items = grouped.get(sectionKey) ?? [];
            const highlightReady = sectionKey === "ready";

            return (
              <section
                key={sectionKey}
                className={`rounded-2xl border p-3 ${
                  highlightReady
                    ? "border-[var(--success)]/40 bg-[var(--success)]/5"
                    : "border-[var(--line)] bg-[var(--surface-2)]/60"
                }`}
              >
                <h2 className="mb-3 flex items-center justify-between gap-2 text-lg font-bold">
                  <span>{sectionTitles[sectionKey]}</span>
                  <span className="rounded-lg bg-[var(--surface-3)] px-2 py-0.5 text-sm font-normal tabular-nums text-[var(--ink-muted)]">
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
                        <li key={order.id}>
                          <OrderCard
                            order={order}
                            presence={presence}
                            busy={busyId === order.id}
                            onAction={() => void handleAction(order)}
                            priority={priority}
                          />
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AttentionRow({
  order,
  busy,
  onAction,
}: {
  order: StaffQueueOrder;
  busy: boolean;
  onAction: () => void;
}) {
  const { t } = useStaffI18n();
  const label = identityLabel(order, t);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[var(--elevated)] p-3">
      <Link href={`/staff/orders/${order.id}`} className="min-w-0 flex-1">
        <p className="text-lg font-black tabular-nums">
          #{order.public_order_number}
        </p>
        <p className="truncate text-sm font-semibold text-[var(--accent)]">
          {t.queue.waitingOutside} · {label}
        </p>
      </Link>
      {order.primaryAction ? (
        <Button
          size="sm"
          className="shrink-0"
          disabled={busy}
          onClick={onAction}
        >
          {busy ? "…" : actionLabelForNext(order.primaryAction.next, t.actions)}
        </Button>
      ) : (
        <Button asLink href={`/staff/orders/${order.id}`} size="sm" variant="secondary">
          {t.queue.openOrder}
        </Button>
      )}
    </div>
  );
}

function OrderCard({
  order,
  presence,
  busy,
  onAction,
  priority,
  featured = false,
}: {
  order: StaffQueueOrder;
  presence: CustomerPresence;
  busy: boolean;
  onAction: () => void;
  priority: boolean;
  featured?: boolean;
}) {
  const { t } = useStaffI18n();
  const waitMin = waitMinutes(order);
  const tone = waitTone(waitMin);
  const dineIn = isDineIn(order);
  const stale =
    (order.status === "READY" ||
      order.status === "CUSTOMER_ARRIVED" ||
      order.status === "OUT_FOR_DELIVERY") &&
    waitMin >= STALE_READY_MINUTES;
  const presenceSince =
    presence === "outside" || presence === "claimed_received"
      ? elapsedMinutes(
          order.customer_presence_updated_at ?? order.customer_arrived_at,
        )
      : presence === "on_the_way"
        ? elapsedMinutes(order.customer_presence_updated_at ?? order.on_my_way_at)
        : 0;

  const waitClass =
    tone === "hot"
      ? "bg-[var(--danger)]/15 text-[var(--danger)]"
      : tone === "warn"
        ? "bg-[var(--cod-amber)]/20 text-[#92400e]"
        : "bg-[var(--surface-3)] text-[var(--ink-muted)]";

  return (
    <article
      className={`rounded-2xl border bg-[var(--elevated)] ${
        priority
          ? "border-[var(--accent)] shadow-[inset_0_0_0_1px_var(--accent)]"
          : stale
            ? "border-[var(--danger)]/35"
            : "border-[var(--line)]"
      } ${featured ? "p-4" : "p-3.5"}`}
    >
      <Link href={`/staff/orders/${order.id}`} className="block">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={`font-black tabular-nums leading-none ${
                featured ? "text-4xl" : "text-3xl"
              }`}
            >
              #{order.public_order_number}
            </p>
            <p
              className={`mt-2 truncate font-bold text-[var(--ink)] ${
                featured ? "text-2xl" : "text-xl"
              }`}
            >
              {identityLabel(order, t)}
            </p>
            {!dineIn && order.plate_hint_snapshot ? (
              <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
                {t.queue.plate} · {order.plate_hint_snapshot}
              </p>
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${waitClass}`}
          >
            {formatStaffWait(waitMin, t.wait)}
          </span>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-lg bg-[var(--surface-3)] px-2 py-0.5 text-xs font-semibold">
            {dineIn ? t.queue.dineIn : t.queue.curbside}
          </span>
          {!dineIn ? (
            <ArrivalBadge
              presence={presence}
              label={presenceLabel(presence, t.presence)}
            />
          ) : null}
          {stale ? (
            <span className="rounded-lg bg-[var(--danger)]/15 px-2 py-0.5 text-xs font-bold text-[var(--danger)]">
              {t.queue.stale}
            </span>
          ) : null}
          {tone === "hot" && !stale ? (
            <span className="rounded-lg bg-[var(--danger)]/15 px-2 py-0.5 text-xs font-bold text-[var(--danger)]">
              {t.queue.urgent}
            </span>
          ) : null}
          {presenceSince > 0 && presence !== "none" ? (
            <span className="text-xs text-[var(--ink-muted)]">
              {t.queue.since} {formatStaffWait(presenceSince, t.wait)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-muted)]">
          <span className="font-medium text-[var(--ink)]">
            {order.itemCount} {t.queue.items}
          </span>
          <span aria-hidden>·</span>
          <span className="font-semibold text-[var(--ink)]">
            {formatSar(order.total_minor)}
          </span>
          <PaymentBadge
            paymentMethod={order.payment_method}
            paymentStatus={order.payment_status}
            labels={t.payment}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">{t.queue.tapToOpen}</p>
      </Link>

      {order.primaryAction ? (
        <Button
          className="mt-3 w-full"
          size={featured ? "lg" : "default"}
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
    </article>
  );
}
