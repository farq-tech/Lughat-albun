"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { useCart } from "@/components/order/cart-store";
import {
  getGroupsForProduct,
  readCachedMenu,
  unitPriceMinor,
} from "@/components/order/menu-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatVehicleLabel } from "@/domains/vehicles/validation";
import { calculateTax, formatSar } from "@/lib/money";
import { checkoutAction } from "@/server/actions/checkout";
import type { OrderSource } from "@/types/database";

type SavedVehicle = {
  id: string;
  make_model: string;
  color: string;
  plate_hint: string | null;
};

type CheckoutFormProps = {
  source: OrderSource;
  savedVehicle: SavedVehicle | null;
};

export function CheckoutForm({ source, savedVehicle }: CheckoutFormProps) {
  const router = useRouter();
  const { items, clear, itemCount } = useCart();
  const [pending, startTransition] = useTransition();

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [useSavedVehicle, setUseSavedVehicle] = useState(!!savedVehicle);
  const [makeModel, setMakeModel] = useState(savedVehicle?.make_model ?? "");
  const [color, setColor] = useState(savedVehicle?.color ?? "");
  const [plateHint, setPlateHint] = useState(savedVehicle?.plate_hint ?? "");
  const [error, setError] = useState<string | null>(null);

  const idempotencyKey = useMemo(() => nanoid(24), []);

  const displayTotalMinor = useMemo(() => {
    const menu = readCachedMenu();
    if (!menu || items.length === 0) return 0;
    const productMap = new Map(menu.products.map((p) => [p.id, p]));
    const subtotal = items.reduce((sum, line) => {
      const product = productMap.get(line.productId);
      if (!product) return sum;
      const groups = getGroupsForProduct(menu, line.productId);
      const unit = unitPriceMinor(product, line.modifiers, groups);
      return sum + unit * line.quantity;
    }, 0);
    return subtotal + calculateTax(subtotal, 1500);
  }, [items]);

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
        clientTotalMinor: displayTotalMinor > 0 ? displayTotalMinor : undefined,
        source,
        idempotencyKey,
        paymentMethod: "cash_on_delivery",
      });

      if (!result.ok) {
        if (result.code === "PRICE_CHANGED") {
          setError("تغير سعر أحد المنتجات — حدّث الصفحة وكمّل الطلب.");
        } else {
          setError(result.message);
        }
        return;
      }

      clear();

      const { publicOrderNumber, accessToken } = result.data;
      const tokenQuery = accessToken
        ? `?t=${encodeURIComponent(accessToken)}`
        : "";
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
            aria-label="رقم الجوال"
            className="ui-input text-left"
          />
          <span className="text-xs text-[var(--ink-muted)]">
            مثال: 0501234567
          </span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">الاسم — اختياري</span>
          <input
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={40}
            className="ui-input"
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
                aria-label="نوع السيارة"
                className="ui-input"
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
                aria-label="لون السيارة"
                className="ui-input"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">آخر 3 من اللوحة — اختياري</span>
              <input
                type="text"
                dir="ltr"
                maxLength={3}
                value={plateHint}
                onChange={(e) => setPlateHint(e.target.value)}
                aria-label="آخر أرقام اللوحة"
                className="ui-input text-left"
              />
            </label>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">طريقة الدفع</h2>
        <div className="rounded-xl border border-[var(--cod-amber)] bg-[var(--elevated)] px-4 py-3">
          <Badge tone="cod" dot="cod">
            الدفع عند الاستلام
          </Badge>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            ادفع كاش عند استلام طلبك من السيارة.
          </p>
        </div>
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
        <p
          className="rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending
          ? "جاري تأكيد الطلب..."
          : "أكد الطلب — الدفع عند الاستلام"}
      </Button>
    </form>
  );
}
