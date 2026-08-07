"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatSar } from "@/lib/money";
import { toggleProductAvailabilityAction } from "@/server/actions/admin";
import type { Category, Product } from "@/types/database";

type AdminMenuViewProps = {
  categories: Category[];
  products: Product[];
};

export function AdminMenuView({ categories, products }: AdminMenuViewProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const byCategory = categories.map((cat) => ({
    category: cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));

  async function toggle(product: Product) {
    setBusyId(product.id);
    await toggleProductAvailabilityAction({
      productId: product.id,
      isAvailable: !product.is_available,
    });
    setBusyId(null);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-[var(--accent)] hover:underline"
      >
        ← رجوع
      </Link>

      <h1 className="mb-6 text-2xl font-bold">المنيو</h1>

      <div className="space-y-8">
        {byCategory.map(({ category, products: catProducts }) => (
          <section key={category.id}>
            <h2 className="mb-3 text-lg font-bold text-[var(--ink-muted)]">
              {category.name_ar}
              {!category.is_active ? (
                <span className="mr-2 text-sm font-normal text-[var(--danger)]">
                  (غير نشط)
                </span>
              ) : null}
            </h2>

            {catProducts.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">لا أصناف</p>
            ) : (
              <ul className="space-y-2">
                {catProducts.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{product.name_ar}</p>
                      <p className="text-sm text-[var(--ink-muted)]">
                        {formatSar(product.price_minor)}
                        {!product.is_active ? " · غير نشط" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === product.id || !product.is_active}
                      onClick={() => void toggle(product)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        product.is_available
                          ? "bg-green-100 text-green-800"
                          : "bg-[var(--surface-2)] text-[var(--ink-muted)]"
                      } disabled:opacity-50`}
                    >
                      {busyId === product.id
                        ? "…"
                        : product.is_available
                          ? "متوفر"
                          : "غير متوفر"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
