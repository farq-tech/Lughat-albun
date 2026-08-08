"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { SocialLinks } from "@/components/brand/social-links";
import { useCart } from "@/components/order/cart-store";
import { Button } from "@/components/ui/button";
import {
  cacheMenu,
  getGroupsForProduct,
  unitPriceMinor,
} from "@/components/order/menu-helpers";
import { formatSar } from "@/lib/money";
import type {
  CartLineInput,
  CartModifierSelection,
  Category,
  ModifierGroup,
  Product,
} from "@/types/database";

export type MenuPayload = {
  categories: Category[];
  products: Product[];
  groups: ModifierGroup[];
  productGroups: Record<string, string[]>;
};

type MenuViewProps = {
  menu: MenuPayload;
  source: "qr" | "link" | "repeat" | "admin";
};

type ActiveProduct = {
  product: Product;
  groupIds: string[];
};

function validateModifiers(
  groups: ModifierGroup[],
  selected: CartModifierSelection[],
): string | null {
  const byGroup = new Map<string, string[]>();
  for (const sel of selected) {
    const list = byGroup.get(sel.groupId) ?? [];
    list.push(sel.optionId);
    byGroup.set(sel.groupId, list);
  }

  for (const group of groups) {
    const count = byGroup.get(group.id)?.length ?? 0;
    if (group.required && count < Math.max(group.min_selection, 1)) {
      return `اختر ${group.name_ar}`;
    }
    if (count < group.min_selection || count > group.max_selection) {
      return `تحقق من ${group.name_ar}`;
    }
  }
  return null;
}

function defaultSelections(groups: ModifierGroup[]): CartModifierSelection[] {
  const selections: CartModifierSelection[] = [];
  for (const group of groups) {
    if (group.required && group.min_selection >= 1) {
      const first = group.options.find((o) => o.is_active && o.is_available);
      if (first) {
        selections.push({ groupId: group.id, optionId: first.id });
      }
    }
  }
  return selections;
}

export function MenuView({ menu, source }: MenuViewProps) {
  const { items, addItem, removeItem, setQuantity, itemCount } = useCart();

  useEffect(() => {
    cacheMenu(menu);
  }, [menu]);

  const [active, setActive] = useState<ActiveProduct | null>(null);
  const [modifierSelections, setModifierSelections] = useState<
    CartModifierSelection[]
  >([]);
  const [modifierQty, setModifierQty] = useState(1);
  const [modifierError, setModifierError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const productMap = useMemo(
    () => new Map(menu.products.map((p) => [p.id, p])),
    [menu.products],
  );

  const featured = useMemo(
    () =>
      menu.products.filter((p) => p.is_featured && p.is_available).slice(0, 6),
    [menu.products],
  );

  const categoriesWithProducts = useMemo(() => {
    return menu.categories
      .map((cat) => ({
        category: cat,
        products: menu.products.filter(
          (p) => p.category_id === cat.id && p.is_available,
        ),
      }))
      .filter((c) => c.products.length > 0);
  }, [menu.categories, menu.products]);

  const displayTotalMinor = useMemo(() => {
    return items.reduce((sum, line) => {
      const product = productMap.get(line.productId);
      if (!product) return sum;
      const groups = getGroupsForProduct(menu, line.productId);
      const unit = unitPriceMinor(product, line.modifiers, groups);
      return sum + unit * line.quantity;
    }, 0);
  }, [items, menu, productMap]);

  const openProduct = useCallback(
    (product: Product) => {
      const groups = getGroupsForProduct(menu, product.id);
      setActive({ product, groupIds: groups.map((g) => g.id) });
      setModifierSelections(defaultSelections(groups));
      setModifierQty(1);
      setModifierError(null);
    },
    [menu],
  );

  const closeModifier = () => {
    setActive(null);
    setModifierError(null);
  };

  const toggleOption = (group: ModifierGroup, optionId: string) => {
    setModifierError(null);
    setModifierSelections((prev) => {
      const inGroup = prev.filter((s) => s.groupId === group.id);
      const has = inGroup.some((s) => s.optionId === optionId);

      if (group.max_selection === 1) {
        return [...prev.filter((s) => s.groupId !== group.id), { groupId: group.id, optionId }];
      }

      if (has) {
        return prev.filter(
          (s) => !(s.groupId === group.id && s.optionId === optionId),
        );
      }
      if (inGroup.length >= group.max_selection) return prev;
      return [...prev, { groupId: group.id, optionId }];
    });
  };

  const handleAddToCart = () => {
    if (!active) return;
    const groups = getGroupsForProduct(menu, active.product.id);
    const err = validateModifiers(groups, modifierSelections);
    if (err) {
      setModifierError(err);
      return;
    }
    addItem({
      productId: active.product.id,
      quantity: modifierQty,
      modifiers: modifierSelections,
    });
    closeModifier();
  };

  const activeGroups = active
    ? getGroupsForProduct(menu, active.product.id)
    : [];
  const activeUnitPrice = active
    ? unitPriceMinor(active.product, modifierSelections, activeGroups)
    : 0;

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-28">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--parchment-from)]/90 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl text-[var(--ink)]">لغة البن</p>
            <p className="text-xs text-[var(--ink-muted)]">طلب من السيارة</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="عرض السلة"
          >
            <ShoppingBag className="size-4" />
            {itemCount > 0 && <span>{itemCount}</span>}
          </Button>
        </div>
      </header>

      <div className="px-5 pt-6">
        {featured.length > 0 && (
          <section className="mb-10 animate-fade-up">
            <h2 className="mb-4 text-lg font-semibold text-[var(--ink)]">
              الأكثر طلبًا
            </h2>
            <div className="grid gap-3">
              {featured.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={() => openProduct(product)}
                />
              ))}
            </div>
          </section>
        )}

        {categoriesWithProducts.map(({ category, products }) => (
          <section key={category.id} className="mb-10 animate-fade-up">
            <h2 className="mb-4 text-lg font-semibold text-[var(--ink)]">
              {category.name_ar}
            </h2>
            <div className="grid gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={() => openProduct(product)}
                />
              ))}
            </div>
          </section>
        ))}

        <SocialLinks className="pb-4 pt-2" />
      </div>

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg animate-sticky-cart border-t border-[var(--line)] bg-[var(--elevated)]/95 px-5 pb-6 pt-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--ink-muted)]">{itemCount} أصناف</p>
              <p className="text-lg font-bold">{formatSar(displayTotalMinor)}</p>
            </div>
            <Button
              type="button"
              size="lg"
              className="min-w-[9.5rem]"
              onClick={() => setCartOpen(true)}
            >
              إتمام الطلب
            </Button>
          </div>
        </div>
      )}

      {active && (
        <ModifierSheet
          product={active.product}
          groups={activeGroups}
          selections={modifierSelections}
          quantity={modifierQty}
          unitPrice={activeUnitPrice}
          error={modifierError}
          onClose={closeModifier}
          onToggle={toggleOption}
          onQtyChange={setModifierQty}
          onConfirm={handleAddToCart}
        />
      )}

      {cartOpen && (
        <CartSheet
          items={items}
          menu={menu}
          productMap={productMap}
          source={source}
          onClose={() => setCartOpen(false)}
          onRemove={removeItem}
          onQuantity={setQuantity}
          displayTotalMinor={displayTotalMinor}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!product.is_available}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--elevated)]/55 px-4 py-3.5 text-right transition hover:border-[var(--accent)]/35 hover:bg-[var(--surface-2)] disabled:opacity-50"
    >
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-[var(--ink)]">{product.name_ar}</h3>
        {product.name_en ? (
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{product.name_en}</p>
        ) : null}
        {product.description_ar && (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-muted)]">
            {product.description_ar}
          </p>
        )}
        {!product.is_available && (
          <p className="mt-1 text-sm text-[var(--danger)]">غير متوفر</p>
        )}
      </div>
      <p className="shrink-0 text-base font-semibold text-[var(--accent)]">
        {formatSar(product.price_minor)}
      </p>
    </button>
  );
}

function ModifierSheet({
  product,
  groups,
  selections,
  quantity,
  unitPrice,
  error,
  onClose,
  onToggle,
  onQtyChange,
  onConfirm,
}: {
  product: Product;
  groups: ModifierGroup[];
  selections: CartModifierSelection[];
  quantity: number;
  unitPrice: number;
  error: string | null;
  onClose: () => void;
  onToggle: (group: ModifierGroup, optionId: string) => void;
  onQtyChange: (qty: number) => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[var(--ink)]/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modifier-title"
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-[var(--parchment-from)] p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="modifier-title" className="text-xl font-semibold">
              {product.name_ar}
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {formatSar(unitPrice)} للقطعة
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        {groups.map((group) => (
          <fieldset key={group.id} className="mb-6">
            <legend className="mb-2 text-sm font-semibold">
              {group.name_ar}
              {group.required && (
                <span className="mr-1 text-[var(--accent)]">*</span>
              )}
            </legend>
            <div className="grid gap-2">
              {group.options
                .filter((o) => o.is_active)
                .map((option) => {
                  const selected = selections.some(
                    (s) =>
                      s.groupId === group.id && s.optionId === option.id,
                  );
                  const disabled = !option.is_available;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggle(group, option.id)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent)]/10"
                          : "border-[var(--line)] bg-[var(--surface-2)]/40"
                      } disabled:opacity-40`}
                    >
                      <span>{option.name_ar}</span>
                      {option.price_delta_minor > 0 && (
                        <span className="text-[var(--ink-muted)]">
                          +{formatSar(option.price_delta_minor)}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </fieldset>
        ))}

        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">الكمية</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onQtyChange(Math.max(1, quantity - 1))}
              className="rounded-xl border border-[var(--line)] p-2"
              aria-label="تقليل"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-[2ch] text-center font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onQtyChange(Math.min(20, quantity + 1))}
              className="rounded-xl border border-[var(--line)] p-2"
              aria-label="زيادة"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-3 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}

        <Button type="button" size="lg" className="w-full" onClick={onConfirm}>
          أضف للسلة — {formatSar(unitPrice * quantity)}
        </Button>
      </div>
    </div>
  );
}

function CartSheet({
  items,
  menu,
  productMap,
  source,
  onClose,
  onRemove,
  onQuantity,
  displayTotalMinor,
}: {
  items: CartLineInput[];
  menu: MenuPayload;
  productMap: Map<string, Product>;
  source: MenuViewProps["source"];
  onClose: () => void;
  onRemove: (index: number) => void;
  onQuantity: (index: number, qty: number) => void;
  displayTotalMinor: number;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/40 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl bg-[var(--parchment-from)] shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] p-5">
          <h2 id="cart-title" className="text-xl font-semibold">
            سلتك
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="text-center text-[var(--ink-muted)]">السلة فاضية</p>
          ) : (
            <ul className="space-y-4">
              {items.map((line, index) => {
                const product = productMap.get(line.productId);
                if (!product) return null;
                const groups = getGroupsForProduct(menu, line.productId);
                const unit = unitPriceMinor(product, line.modifiers, groups);
                const modLabels = line.modifiers
                  .map((sel) => {
                    const g = groups.find((gr) => gr.id === sel.groupId);
                    const o = g?.options.find((op) => op.id === sel.optionId);
                    return o?.name_ar;
                  })
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li
                    key={`${line.productId}-${index}`}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{product.name_ar}</p>
                        {modLabels && (
                          <p className="mt-1 text-xs text-[var(--ink-muted)]">
                            {modLabels}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-[var(--accent)]">
                          {formatSar(unit * line.quantity)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="text-sm text-[var(--danger)]"
                      >
                        حذف
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onQuantity(index, line.quantity - 1)}
                        className="rounded-lg border border-[var(--line)] p-1.5"
                        aria-label="تقليل"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-[2ch] text-center text-sm font-medium">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onQuantity(index, line.quantity + 1)}
                        className="rounded-lg border border-[var(--line)] p-1.5"
                        aria-label="زيادة"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--line)] p-5">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-[var(--ink-muted)]">المجموع (تقديري)</span>
            <span className="text-lg font-semibold">
              {formatSar(displayTotalMinor)}
            </span>
          </div>
          {items.length > 0 && (
            <Button asLink href={`/order/checkout?source=${source}`} size="lg" className="w-full">
              إكمال الطلب
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
