import type {
  CartModifierSelection,
  ModifierGroup,
  Product,
} from "@/types/database";
import type { MenuPayload } from "./menu-view";

export function getGroupsForProduct(
  menu: MenuPayload,
  productId: string,
): ModifierGroup[] {
  const ids = menu.productGroups[productId] ?? [];
  return ids
    .map((id) => menu.groups.find((g) => g.id === id))
    .filter((g): g is ModifierGroup => !!g && g.is_active);
}

export function unitPriceMinor(
  product: Product,
  modifiers: CartModifierSelection[],
  groups: ModifierGroup[],
): number {
  let total = product.price_minor;
  for (const sel of modifiers) {
    const group = groups.find((g) => g.id === sel.groupId);
    const opt = group?.options.find((o) => o.id === sel.optionId);
    if (opt) total += opt.price_delta_minor;
  }
  return total;
}

export const MENU_CACHE_KEY = "lab_menu_cache";

export function cacheMenu(menu: MenuPayload) {
  try {
    sessionStorage.setItem(MENU_CACHE_KEY, JSON.stringify(menu));
  } catch {
    // ignore
  }
}

export function readCachedMenu(): MenuPayload | null {
  try {
    const raw = sessionStorage.getItem(MENU_CACHE_KEY);
    return raw ? (JSON.parse(raw) as MenuPayload) : null;
  } catch {
    return null;
  }
}
