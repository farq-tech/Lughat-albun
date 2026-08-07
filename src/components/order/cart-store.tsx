"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type { CartLineInput, CartModifierSelection } from "@/types/database";

const STORAGE_KEY = "lab_cart_v1";

type CartContextValue = {
  items: CartLineInput[];
  addItem: (item: CartLineInput) => void;
  removeItem: (index: number) => void;
  setQuantity: (index: number, quantity: number) => void;
  clear: () => void;
  itemCount: number;
  pending: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartLineInput[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartLineInput[];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineInput[]>(readStoredCart);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      pending,
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      addItem: (item) => {
        startTransition(() => {
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
        });
      },
      removeItem: (index) =>
        startTransition(() =>
          setItems((prev) => prev.filter((_, i) => i !== index)),
        ),
      setQuantity: (index, quantity) =>
        startTransition(() =>
          setItems((prev) => {
            if (quantity < 1) return prev.filter((_, i) => i !== index);
            return prev.map((item, i) =>
              i === index ? { ...item, quantity } : item,
            );
          }),
        ),
      clear: () => startTransition(() => setItems([])),
    }),
    [items, pending],
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
