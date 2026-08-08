"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLineInput, CartModifierSelection } from "@/types/database";

/** Bump when menu/modifier ids change incompatibly so stale carts reset. */
const STORAGE_KEY = "lab_cart_v2";

type CartContextValue = {
  items: CartLineInput[];
  addItem: (item: CartLineInput) => void;
  removeItem: (index: number) => void;
  setQuantity: (index: number, quantity: number) => void;
  clear: () => void;
  replaceItems: (items: CartLineInput[]) => void;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartLineInput[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Drop pre-menu-sync carts that break checkout after catalog changes.
      localStorage.removeItem("lab_cart_v1");
      return [];
    }
    return JSON.parse(raw) as CartLineInput[];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineInput[]>(readStoredCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: CartLineInput) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (p) =>
          p.productId === item.productId &&
          sameMods(p.modifiers, item.modifiers),
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + item.quantity,
        };
        return next;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setQuantity = useCallback((index: number, quantity: number) => {
    setItems((prev) => {
      if (quantity < 1) return prev.filter((_, i) => i !== index);
      return prev.map((item, i) =>
        i === index ? { ...item, quantity } : item,
      );
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const replaceItems = useCallback((next: CartLineInput[]) => setItems(next), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      addItem,
      removeItem,
      setQuantity,
      clear,
      replaceItems,
    }),
    [items, addItem, removeItem, setQuantity, clear, replaceItems],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function sameMods(a: CartModifierSelection[], b: CartModifierSelection[]) {
  if (a.length !== b.length) return false;
  const sa = [...a]
    .map((m) => `${m.groupId}:${m.optionId}`)
    .sort()
    .join("|");
  const sb = [...b]
    .map((m) => `${m.groupId}:${m.optionId}`)
    .sort()
    .join("|");
  return sa === sb;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
