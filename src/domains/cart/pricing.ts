import { assertMinor, calculateTax, sumMinor } from "@/lib/money";
import type {
  CartLineInput,
  CartTotals,
  ModifierGroup,
  ModifierOption,
  PricedCartLine,
  Product,
} from "@/types/database";

export interface PricingCatalog {
  products: Map<string, Product>;
  groups: Map<string, ModifierGroup>;
  options: Map<string, ModifierOption>;
  productGroupIds: Map<string, string[]>;
  taxRateBps: number;
  serviceFeeMinor: number;
  currency?: string;
}

export interface PriceCartResult {
  lines: PricedCartLine[];
  totals: CartTotals;
}

function optionsForGroup(
  catalog: PricingCatalog,
  groupId: string,
): ModifierOption[] {
  return [...catalog.options.values()]
    .filter(
      (o) => o.group_id === groupId && o.is_active && o.is_available,
    )
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Keep valid selections and fill missing required modifiers with defaults. */
export function withDefaultModifiers(
  productId: string,
  selected: CartLineInput["modifiers"],
  catalog: PricingCatalog,
): CartLineInput["modifiers"] {
  const groupIds = catalog.productGroupIds.get(productId) ?? [];
  const allowed = new Set(groupIds);

  const cleaned = selected.filter((sel) => {
    if (!allowed.has(sel.groupId)) return false;
    const option = catalog.options.get(sel.optionId);
    return (
      !!option &&
      option.group_id === sel.groupId &&
      option.is_active &&
      option.is_available
    );
  });

  const presentGroups = new Set(cleaned.map((s) => s.groupId));
  const result = [...cleaned];

  for (const groupId of groupIds) {
    const group = catalog.groups.get(groupId);
    if (!group?.is_active) continue;
    if (presentGroups.has(groupId)) continue;
    if (group.required && Math.max(group.min_selection, 1) >= 1) {
      const first = optionsForGroup(catalog, groupId)[0];
      if (first) {
        result.push({ groupId, optionId: first.id });
        presentGroups.add(groupId);
      }
    }
  }

  return result;
}

function validateModifiers(
  productId: string,
  selected: CartLineInput["modifiers"],
  catalog: PricingCatalog,
): { ok: true; priced: PricedCartLine["modifiers"] } | { ok: false; reason: string } {
  const groupIds = catalog.productGroupIds.get(productId) ?? [];
  const priced: PricedCartLine["modifiers"] = [];
  const byGroup = new Map<string, string[]>();

  for (const sel of selected) {
    if (!groupIds.includes(sel.groupId)) {
      return { ok: false, reason: "MODIFIER_NOT_ALLOWED" };
    }
    const option = catalog.options.get(sel.optionId);
    if (!option || option.group_id !== sel.groupId) {
      return { ok: false, reason: "MODIFIER_INVALID" };
    }
    if (!option.is_active || !option.is_available) {
      return { ok: false, reason: "MODIFIER_UNAVAILABLE" };
    }
    const list = byGroup.get(sel.groupId) ?? [];
    list.push(sel.optionId);
    byGroup.set(sel.groupId, list);
  }

  for (const groupId of groupIds) {
    const group = catalog.groups.get(groupId);
    if (!group || !group.is_active) continue;
    const count = byGroup.get(groupId)?.length ?? 0;
    if (group.required && count < Math.max(group.min_selection, 1)) {
      return { ok: false, reason: "MODIFIER_REQUIRED" };
    }
    if (count < group.min_selection || count > group.max_selection) {
      return { ok: false, reason: "MODIFIER_SELECTION_RANGE" };
    }
  }

  for (const sel of selected) {
    const group = catalog.groups.get(sel.groupId)!;
    const option = catalog.options.get(sel.optionId)!;
    priced.push({
      groupId: group.id,
      groupName: group.name_ar,
      optionId: option.id,
      optionName: option.name_ar,
      priceDeltaMinor: assertMinor(option.price_delta_minor),
    });
  }

  return { ok: true, priced };
}

export function priceCart(
  items: CartLineInput[],
  catalog: PricingCatalog,
  previousClientTotalMinor?: number,
): PriceCartResult {
  const lines: PricedCartLine[] = [];
  const unavailableItems: string[] = [];
  const invalidItems: string[] = [];

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error("INVALID_QUANTITY");
    }
    const product = catalog.products.get(item.productId);
    if (!product || !product.is_active) {
      invalidItems.push(product?.name_ar ?? "منتج");
      continue;
    }

    // Only admin toggle can mark a product sold out.
    if (!product.is_available) {
      unavailableItems.push(product.name_ar);
      lines.push({
        productId: product.id,
        productName: product.name_ar,
        quantity: item.quantity,
        unitPriceMinor: product.price_minor,
        modifiers: [],
        lineTotalMinor: 0,
        available: false,
      });
      continue;
    }

    let modResult = validateModifiers(product.id, item.modifiers, catalog);
    if (!modResult.ok) {
      const repaired = withDefaultModifiers(product.id, item.modifiers, catalog);
      modResult = validateModifiers(product.id, repaired, catalog);
    }
    if (!modResult.ok) {
      invalidItems.push(product.name_ar);
      lines.push({
        productId: product.id,
        productName: product.name_ar,
        quantity: item.quantity,
        unitPriceMinor: product.price_minor,
        modifiers: [],
        lineTotalMinor: 0,
        available: false,
      });
      continue;
    }

    const unit =
      assertMinor(product.price_minor) +
      sumMinor(modResult.priced.map((m) => m.priceDeltaMinor));
    const lineTotalMinor = unit * item.quantity;

    lines.push({
      productId: product.id,
      productName: product.name_ar,
      quantity: item.quantity,
      unitPriceMinor: unit,
      modifiers: modResult.priced,
      lineTotalMinor,
      available: true,
    });
  }

  const availableLines = lines.filter((l) => l.available);
  const subtotalMinor = sumMinor(availableLines.map((l) => l.lineTotalMinor));
  const taxAmountMinor = calculateTax(subtotalMinor, catalog.taxRateBps);
  const serviceFeeMinor = assertMinor(catalog.serviceFeeMinor);
  const totalMinor = subtotalMinor + taxAmountMinor + serviceFeeMinor;

  // Ignore missing/zero client totals (display estimate may be unavailable).
  // Only flag a real mismatch when the client sent a positive total.
  const priceChanged =
    typeof previousClientTotalMinor === "number" &&
    previousClientTotalMinor > 0 &&
    previousClientTotalMinor !== totalMinor;

  return {
    lines,
    totals: {
      subtotalMinor,
      taxAmountMinor,
      serviceFeeMinor,
      totalMinor,
      currency: catalog.currency ?? "SAR",
      priceChanged,
      unavailableItems,
      invalidItems,
    },
  };
}

export function canCheckout(result: PriceCartResult): boolean {
  return (
    result.lines.some((l) => l.available) &&
    result.totals.unavailableItems.length === 0 &&
    result.totals.invalidItems.length === 0 &&
    result.totals.totalMinor > 0 &&
    !result.totals.priceChanged
  );
}
