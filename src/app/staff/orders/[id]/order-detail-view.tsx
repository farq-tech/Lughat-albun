"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatSar } from "@/lib/money";
import {
  CUSTOMER_PRESENCE_LABELS,
  type CustomerPresence,
} from "@/domains/orders/customer-presence";
import { staffPrimaryAction, staffStatusLabel } from "@/domains/orders/state-machine";
import {
  staffCannotLocateAction,
  staffTransitionAction,
} from "@/server/actions/staff";
import type { OrderStatus } from "@/types/database";

type OrderDetail = {
  order: {
    id: string;
    public_order_number: number;
    status: OrderStatus;
    phone: string;
    customer_name: string | null;
    car_make_model_snapshot: string | null;
    car_color_snapshot: string | null;
    plate_hint_snapshot: string | null;
    location_hint: string | null;
    flasher_confirmed: boolean;
    customer_on_the_way: boolean;
    customer_presence?: CustomerPresence | null;
    customer_presence_updated_at?: string | null;
    location_help_requested: boolean;
    subtotal_minor: number;
    tax_amount_minor: number;
    service_fee_minor: number;
    total_minor: number;
    payment_status: string;
    created_at: string;
    paid_at: string | null;
    customer_arrived_at: string | null;
  };
  items: {
    id: string;
    product_name_snapshot: string;
    quantity: number;
    unit_price_minor: number;
    line_total_minor: number;
    order_item_modifiers: {
      group_name_snapshot: string;
      option_name_snapshot: string;
      price_delta_minor: number;
    }[];
  }[];
  events: {
    id: string;
    event_type: string;
    from_status: OrderStatus | null;
    to_status: OrderStatus | null;
    created_at: string;
  }[];
};

const EVENT_LABELS: Record<string, string> = {
  PAYMENT_CONFIRMED: "تأكيد الدفع",
  ACCEPTED: "قبول الطلب",
  PREPARING: "جاري التجهيز",
  READY: "الطلب جاهز",
  CUSTOMER_ARRIVED: "وصول العميل",
  OUT_FOR_DELIVERY: "خرج للعميل",
  DELIVERED: "تم تسليم الطلب",
  CUSTOMER_ON_THE_WAY: "العميل بالطريق",
  CUSTOMER_OUTSIDE: "العميل برا",
  CUSTOMER_CLAIMED_RECEIVED: "العميل: تم الاستلام",
  LOCATION_HELP_REQUESTED: "طلب مساعدة في الموقع",
  CANCELLED: "إلغاء",
  REFUNDED: "استرجاع",
};

function normalizePresence(order: OrderDetail["order"]): CustomerPresence {
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

export function OrderDetailView({ data }: { data: OrderDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { order, items, events } = data;
  const action = staffPrimaryAction(order.status);
  const presence = normalizePresence(order);
  const canRequestLocateHelp =
    order.status === "READY" ||
    order.status === "CUSTOMER_ARRIVED" ||
    presence === "outside" ||
    presence === "on_the_way";

  async function transition() {
    if (!action) return;
    setBusy(true);
    setMessage(null);
    const result = await staffTransitionAction({
      orderId: order.id,
      toStatus: action.next,
    });
    setBusy(false);
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.message);
    }
  }

  async function cannotLocate() {
    setBusy(true);
    setMessage(null);
    const result = await staffCannotLocateAction({ orderId: order.id });
    setBusy(false);
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-10">
      <Link
        href="/staff"
        className="mb-4 inline-block text-sm text-[var(--accent)] hover:underline"
      >
        ← رجوع للطابور
      </Link>

      <header className="mb-6 rounded-2xl border border-[var(--line)] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">#{order.public_order_number}</h1>
            <p className="mt-1 text-[var(--ink-muted)]">
              {staffStatusLabel(order.status)}
            </p>
          </div>
          <div className="text-left">
            <p className="text-xl font-bold">{formatSar(order.total_minor)}</p>
            {order.payment_status === "PAID" ? (
              <span className="text-xs text-green-700">مدفوع</span>
            ) : null}
          </div>
        </div>

        {presence !== "none" ? (
          <div
            className={`mt-4 rounded-xl px-4 py-3 font-bold ${
              presence === "outside" || presence === "claimed_received"
                ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                : "bg-[var(--accent)]/10 text-[var(--accent)]"
            }`}
          >
            تحديث العميل: {CUSTOMER_PRESENCE_LABELS[presence]}
            {presence === "outside" && order.flasher_confirmed
              ? " — الفلشر شغّال"
              : ""}
          </div>
        ) : null}

        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--ink-muted)]">السيارة</dt>
            <dd>
              {order.car_make_model_snapshot ?? "—"}
              {order.car_color_snapshot ? ` · ${order.car_color_snapshot}` : ""}
            </dd>
          </div>
          {order.plate_hint_snapshot ? (
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">اللوحة</dt>
              <dd>{order.plate_hint_snapshot}</dd>
            </div>
          ) : null}
          {order.location_hint ? (
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">ملاحظة موقع</dt>
              <dd>{order.location_hint}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-[var(--ink-muted)]">الجوال</dt>
            <dd dir="ltr">{order.phone}</dd>
          </div>
          {order.customer_name ? (
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">الاسم</dt>
              <dd>{order.customer_name}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section className="mb-6 rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="mb-3 text-lg font-bold">الأصناف</h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="border-b border-[var(--line)] pb-3 last:border-0">
              <div className="flex justify-between">
                <span>
                  {item.quantity}× {item.product_name_snapshot}
                </span>
                <span>{formatSar(item.line_total_minor)}</span>
              </div>
              {item.order_item_modifiers.length > 0 ? (
                <ul className="mt-1 text-xs text-[var(--ink-muted)]">
                  {item.order_item_modifiers.map((m, i) => (
                    <li key={i}>
                      {m.group_name_snapshot}: {m.option_name_snapshot}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-[var(--line)] pt-3 text-sm">
          <div className="flex justify-between">
            <span>المجموع</span>
            <span>{formatSar(order.subtotal_minor)}</span>
          </div>
          <div className="flex justify-between text-[var(--ink-muted)]">
            <span>الضريبة</span>
            <span>{formatSar(order.tax_amount_minor)}</span>
          </div>
          {order.service_fee_minor > 0 ? (
            <div className="flex justify-between text-[var(--ink-muted)]">
              <span>رسوم الخدمة</span>
              <span>{formatSar(order.service_fee_minor)}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="mb-3 text-lg font-bold">السجل</h2>
        <ol className="space-y-2">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex justify-between gap-4 border-r-2 border-[var(--accent)] pr-3 text-sm"
            >
              <span>{EVENT_LABELS[ev.event_type] ?? ev.event_type}</span>
              <time className="shrink-0 text-[var(--ink-muted)]" dir="ltr">
                {new Date(ev.created_at).toLocaleTimeString("ar-SA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ol>
      </section>

      {message ? (
        <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {action ? (
          <Button disabled={busy} onClick={() => void transition()}>
            {busy ? "…" : action.label}
          </Button>
        ) : null}

        {canRequestLocateHelp &&
        order.status !== "DELIVERED" &&
        order.status !== "CANCELLED" ? (
          <Button
            variant="secondary"
            disabled={busy || order.location_help_requested}
            onClick={() => void cannotLocate()}
          >
            {order.location_help_requested
              ? "تم طلب المساعدة"
              : "ما لقيت السيارة"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
