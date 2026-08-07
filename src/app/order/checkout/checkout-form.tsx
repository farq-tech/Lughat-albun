"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { useCart } from "@/components/order/cart-store";
import { Button } from "@/components/ui/button";
import { formatVehicleLabel } from "@/domains/vehicles/validation";
import { formatSar } from "@/lib/money";
import { checkoutAction } from "@/server/actions/checkout";
import type { OrderSource } from "@/types/database";

type SavedVehicle = {
  id: string;
  make_model: string;
  color: string;
  plate_hint: string | null;
};

type PaymentMethod = "apple_pay" | "mada" | "visa" | "mastercard";

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; preferred?: boolean }[] =
  [
    { id: "apple_pay", label: "Apple Pay", preferred: true },
    { id: "mada", label: "مدى" },
    { id: "visa", label: "Visa" },
    { id: "mastercard", label: "Mastercard" },
  ];

type CheckoutFormProps = {
  source: OrderSource;
  savedVehicle: SavedVehicle | null;
  displayTotalMinor: number;
};

export function CheckoutForm({
  source,
  savedVehicle,
  displayTotalMinor,
}: CheckoutFormProps) {
  const router = useRouter();
  const { items, clear, itemCount } = useCart();
  const [pending, startTransition] = useTransition();

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("apple_pay");
  const [useSavedVehicle, setUseSavedVehicle] = useState(!!savedVehicle);
  const [makeModel, setMakeModel] = useState(savedVehicle?.make_model ?? "");
  const [color, setColor] = useState(savedVehicle?.color ?? "");
  const [plateHint, setPlateHint] = useState(savedVehicle?.plate_hint ?? "");
  const [error, setError] = useState<string | null>(null);

  const idempotencyKey = useMemo(() => nanoid(24), []);

  const vehicleLabel = savedVehicle
    ? formatVehicleLabel(savedVehicle.make_model, savedVehicle.color)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (itemCount === 0) {
      setError("سلتك فاضية. ارجع للقائمة.");
      return;
    }

    startTransition(async () => {
      const vehicle =
        useSavedVehicle && savedVehicle
          ? {
              makeModel: savedVehicle.make_model,
              color: savedVehicle.color,
              plateHint: savedVehicle.plate_hint,
            }
          : {
              makeModel: makeModel.trim(),
              color: color.trim(),
              plateHint: plateHint.trim() || null,
            };

      const result = await checkoutAction({
        items,
        phone: phone.trim(),
        firstName: firstName.trim() || null,
        vehicle,
        vehicleId: useSavedVehicle && savedVehicle ? savedVehicle.id : null,
        clientTotalMinor: displayTotalMinor,
        source,
        idempotencyKey,
        paymentSimulate: "success",
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      clear();

      const { publicOrderNumber, accessToken } = result.data;
      const tokenQuery = accessToken ? `?t=${encodeURIComponent(accessToken)}` : "";
      router.push(`/order/${publicOrderNumber}${tokenQuery}`);
    });
  };

  if (itemCount === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-6 text-center">
        <p className="text-[var(--ink-muted)]">ما فيه منتجات بالسلة</p>
        <Button asLink href="/order/menu" variant="secondary" className="mt-4">
          ارجع للقائمة
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">بياناتك</h2>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">
            رقم الجوال <span className="text-[var(--accent)]">*</span>
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="05xxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left focus:border-[var(--accent)]"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">الاسم (اختياري)</span>
          <input
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={40}
            className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 focus:border-[var(--accent)]"
          />
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">سيارتك</h2>
        {savedVehicle && useSavedVehicle ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-4">
            <p className="font-medium">{vehicleLabel}</p>
            {savedVehicle.plate_hint && (
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                آخر {savedVehicle.plate_hint} من اللوحة
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setUseSavedVehicle(false)}
            >
              تغيير السيارة
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {savedVehicle && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setUseSavedVehicle(true)}
              >
                استخدم {vehicleLabel}
              </Button>
            )}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">نوع السيارة</span>
              <input
                type="text"
                placeholder="مثال: كامري"
                value={makeModel}
                onChange={(e) => setMakeModel(e.target.value)}
                required={!useSavedVehicle}
                className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 focus:border-[var(--accent)]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">اللون</span>
              <input
                type="text"
                placeholder="مثال: أبيض"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                required={!useSavedVehicle}
                className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 focus:border-[var(--accent)]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">آخر 3 من اللوحة (اختياري)</span>
              <input
                type="text"
                dir="ltr"
                maxLength={3}
                value={plateHint}
                onChange={(e) => setPlateHint(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left focus:border-[var(--accent)]"
              />
            </label>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">طريقة الدفع</h2>
        <div className="grid gap-2">
          {PAYMENT_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                paymentMethod === opt.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--line)] bg-[var(--surface-2)]/40"
              }`}
            >
              <span className="flex items-center gap-2">
                {opt.label}
                {opt.preferred && (
                  <span className="text-xs text-[var(--accent)]">مفضّل</span>
                )}
              </span>
              <input
                type="radio"
                name="payment"
                value={opt.id}
                checked={paymentMethod === opt.id}
                onChange={() => setPaymentMethod(opt.id)}
                className="size-4 accent-[var(--accent)]"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-[var(--ink-muted)]">
          الدفع تجريبي حاليًا — ما راح ينخصم منك شي
        </p>
      </section>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--ink-muted)]">المجموع (تقديري)</span>
          <span className="text-xl font-semibold text-[var(--accent)]">
            {formatSar(displayTotalMinor)}
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "جاري الدفع..." : "ادفع واطلب"}
      </Button>
    </form>
  );
}
