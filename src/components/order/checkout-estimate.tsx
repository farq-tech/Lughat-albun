"use client";

import { useMemo, type ReactNode } from "react";
import { readCachedMenu, unitPriceMinor, getGroupsForProduct } from "@/components/order/menu-helpers";
import { useCart } from "@/components/order/cart-store";

type CheckoutEstimateProps = {
  children: (displayTotalMinor: number) => ReactNode;
};

/** Client-side display estimate only — server recalculates at checkout. */
export function CheckoutEstimate({ children }: CheckoutEstimateProps) {
  const { items } = useCart();

  const displayTotalMinor = useMemo(() => {
    const menu = readCachedMenu();
    if (!menu || items.length === 0) return 0;

    const productMap = new Map(menu.products.map((p) => [p.id, p]));
    return items.reduce((sum, line) => {
      const product = productMap.get(line.productId);
      if (!product) return sum;
      const groups = getGroupsForProduct(menu, line.productId);
      const unit = unitPriceMinor(product, line.modifiers, groups);
      return sum + unit * line.quantity;
    }, 0);
  }, [items]);

  return <>{children(displayTotalMinor)}</>;
}
