import { describe, expect, it } from "vitest";
import { canCheckout, priceCart, type PricingCatalog } from "@/domains/cart/pricing";
import type { ModifierGroup, ModifierOption, Product } from "@/types/database";

function catalog(): PricingCatalog {
  const product: Product = {
    id: "22222222-2222-2222-2222-222222222201",
    category_id: "c1",
    slug: "iced-latte",
    name_ar: "آيس لاتيه",
    name_en: "Iced Latte",
    description_ar: null,
    description_en: null,
    price_minor: 1800,
    image_path: null,
    is_active: true,
    is_available: true,
    is_featured: true,
    sort_order: 1,
  };
  const sizeGroup: ModifierGroup = {
    id: "33333333-3333-3333-3333-333333333301",
    slug: "size",
    name_ar: "الحجم",
    name_en: "Size",
    required: true,
    min_selection: 1,
    max_selection: 1,
    sort_order: 1,
    is_active: true,
    options: [],
  };
  const milkGroup: ModifierGroup = {
    id: "33333333-3333-3333-3333-333333333302",
    slug: "milk",
    name_ar: "الحليب",
    name_en: "Milk",
    required: true,
    min_selection: 1,
    max_selection: 1,
    sort_order: 2,
    is_active: true,
    options: [],
  };
  const large: ModifierOption = {
    id: "44444444-4444-4444-4444-444444444402",
    group_id: sizeGroup.id,
    slug: "large",
    name_ar: "كبير",
    name_en: "Large",
    price_delta_minor: 300,
    is_active: true,
    is_available: true,
    sort_order: 2,
  };
  const oat: ModifierOption = {
    id: "44444444-4444-4444-4444-444444444404",
    group_id: milkGroup.id,
    slug: "oat",
    name_ar: "شوفان",
    name_en: "Oat",
    price_delta_minor: 200,
    is_active: true,
    is_available: true,
    sort_order: 2,
  };
  const shot: ModifierOption = {
    id: "44444444-4444-4444-4444-444444444406",
    group_id: "33333333-3333-3333-3333-333333333303",
    slug: "one-shot",
    name_ar: "شوت واحد",
    name_en: "One Shot",
    price_delta_minor: 300,
    is_active: true,
    is_available: true,
    sort_order: 1,
  };
  const shotGroup: ModifierGroup = {
    id: "33333333-3333-3333-3333-333333333303",
    slug: "extra-shot",
    name_ar: "شوت إضافي",
    name_en: "Extra Shot",
    required: false,
    min_selection: 0,
    max_selection: 2,
    sort_order: 3,
    is_active: true,
    options: [],
  };

  return {
    products: new Map([[product.id, product]]),
    groups: new Map([
      [sizeGroup.id, sizeGroup],
      [milkGroup.id, milkGroup],
      [shotGroup.id, shotGroup],
    ]),
    options: new Map([
      [large.id, large],
      [oat.id, oat],
      [shot.id, shot],
    ]),
    productGroupIds: new Map([
      [product.id, [sizeGroup.id, milkGroup.id, shotGroup.id]],
    ]),
    taxRateBps: 1500,
    serviceFeeMinor: 0,
    currency: "SAR",
  };
}

describe("priceCart", () => {
  it("prices iced latte large oat extra shot with VAT", () => {
    const c = catalog();
    const result = priceCart(
      [
        {
          productId: "22222222-2222-2222-2222-222222222201",
          quantity: 1,
          modifiers: [
            {
              groupId: "33333333-3333-3333-3333-333333333301",
              optionId: "44444444-4444-4444-4444-444444444402",
            },
            {
              groupId: "33333333-3333-3333-3333-333333333302",
              optionId: "44444444-4444-4444-4444-444444444404",
            },
            {
              groupId: "33333333-3333-3333-3333-333333333303",
              optionId: "44444444-4444-4444-4444-444444444406",
            },
          ],
        },
      ],
      c,
    );
    // 1800 + 300 + 200 + 300 = 2600
    expect(result.totals.subtotalMinor).toBe(2600);
    expect(result.totals.taxAmountMinor).toBe(390); // 15%
    expect(result.totals.totalMinor).toBe(2990);
    expect(canCheckout(result)).toBe(true);
  });

  it("detects price change vs client total", () => {
    const result = priceCart(
      [
        {
          productId: "22222222-2222-2222-2222-222222222201",
          quantity: 1,
          modifiers: [
            {
              groupId: "33333333-3333-3333-3333-333333333301",
              optionId: "44444444-4444-4444-4444-444444444402",
            },
            {
              groupId: "33333333-3333-3333-3333-333333333302",
              optionId: "44444444-4444-4444-4444-444444444404",
            },
          ],
        },
      ],
      catalog(),
      1000,
    );
    expect(result.totals.priceChanged).toBe(true);
    expect(canCheckout(result)).toBe(false);
  });

  it("marks unavailable products", () => {
    const c = catalog();
    const p = c.products.get("22222222-2222-2222-2222-222222222201")!;
    c.products.set(p.id, { ...p, is_available: false });
    const result = priceCart(
      [
        {
          productId: p.id,
          quantity: 1,
          modifiers: [
            {
              groupId: "33333333-3333-3333-3333-333333333301",
              optionId: "44444444-4444-4444-4444-444444444402",
            },
            {
              groupId: "33333333-3333-3333-3333-333333333302",
              optionId: "44444444-4444-4444-4444-444444444404",
            },
          ],
        },
      ],
      c,
    );
    expect(result.totals.unavailableItems.length).toBeGreaterThan(0);
    expect(canCheckout(result)).toBe(false);
  });
});
