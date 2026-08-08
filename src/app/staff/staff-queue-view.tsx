"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatSar } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import {
  getStaffQueueAction,
  staffTransitionAction,
} from "@/server/actions/staff";
import {
  CUSTOMER_PRESENCE_LABELS,
  type CustomerPresence,
} from "@/domains/orders/customer-presence";
import type { OrderStatus } from "@/types/database";
import type { StaffQueueOrder } from "@/types/staff-queue";

type SectionKey = "new" | "preparing" | "ready" | "legacy";

const SECTIONS: { key: SectionKey; title: string; statuses: OrderStatus[] }[] = [
  { key: "new", title: "جديد", statuses: ["PAID"] },
  { key: "preparing", title: "جاري التجهيز", statuses: ["ACCEPTED", "PREPARING"] },
  { key: "ready", title: "جاهز", statuses: ["READY"] },
  // Legacy-only bucket for historical rows still mid-handoff
  {
    key: "legacy",
    title: "تسليم (قديم)",
    statuses: ["CUSTOMER_ARRIVED", "OUT_FOR_DELIVERY"],
  },
];

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

function formatWait(minutes: number): string {
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `${minutes} د`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} س ${m} د` : `${h} س`;
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
    for (const s of SECTIONS) map.set(s.key, []);
    for (const o of orders) {
      const section = SECTIONS.find((s) => s.statuses.includes(o.status));
      if (section) map.get(section.key)!.push(o);
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
    setActionError(result.message ?? "فشل تحديث حالة الطلب");
  }

  function enableSound() {
    playAlert();
    setSoundEnabled(true);
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl p-4 pb-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">طابور الطلبات</h1>
          <p className="text-sm text-[var(--ink-muted,#6b5c4f)]">لغة البن</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (soundEnabled ? setSoundEnabled(false) : enableSound())}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              soundEnabled
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-muted)]"
            }`}
          >
            {soundEnabled ? "🔔 تنبيهات صوتية" : "🔕 تنبيهات صوتية"}
          </button>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            تحديث
          </Button>
        </div>
      </header>

      {actionError ? (
        <p
          className="mb-4 rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        {SECTIONS.map((section) => {
          const items = grouped.get(section.key) ?? [];
          const highlightReady = section.key === "ready";

          return (
            <section
              key={section.key}
              className={`rounded-2xl border p-3 ${
                highlightReady
                  ? "border-[var(--accent)]/40 bg-[var(--accent)]/5"
                  : "border-[var(--line)] bg-[var(--surface)]"
              }`}
            >
              <h2 className="mb-3 flex items-center justify-between text-lg font-bold">
                {section.title}
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-sm font-normal">
                  {items.length}
                </span>
              </h2>

              <ul className="space-y-3">
                {items.length === 0 ? (
                  <li className="py-8 text-center text-sm text-[var(--ink-muted)]">
                    لا طلبات
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
      className={`rounded-xl border p-3 shadow-sm ${
        priority
          ? "animate-pulse border-[var(--danger)] bg-white"
          : "border-[var(--line)] bg-white"
      }`}
    >
      <Link href={`/staff/orders/${order.id}`} className="block">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-xl font-bold">#{order.public_order_number}</span>
          <span className="text-xs text-[var(--ink-muted)]">
            ⏱ {formatWait(waitMin)}
          </span>
        </div>

        {presence !== "none" ? (
          <div
            className={`mb-2 rounded-lg px-2 py-1 text-sm font-bold ${
              priority
                ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                : "bg-[var(--accent)]/10 text-[var(--accent)]"
            }`}
          >
            العميل: {CUSTOMER_PRESENCE_LABELS[presence]}
            {presenceSince > 0 ? ` — منذ ${formatWait(presenceSince)}` : ""}
          </div>
        ) : null}

        <p className="text-sm text-[var(--ink)]">
          {order.car_make_model_snapshot ?? "—"}
          {order.car_color_snapshot ? ` · ${order.car_color_snapshot}` : ""}
        </p>
        {order.plate_hint_snapshot ? (
          <p className="text-xs text-[var(--ink-muted)]">
            لوحة: {order.plate_hint_snapshot}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--ink-muted)]">
          <span>{order.itemCount} صنف</span>
          <span>{formatSar(order.total_minor)}</span>
          {order.payment_status === "PAID" ? (
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-800">
              مدفوع
            </span>
          ) : null}
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
          {busy ? "…" : order.primaryAction.label}
        </Button>
      ) : null}
    </li>
  );
}
