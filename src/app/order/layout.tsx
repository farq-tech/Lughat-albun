import { CartProvider } from "@/components/order/cart-store";

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
