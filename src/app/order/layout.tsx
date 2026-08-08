import { CartProvider } from "@/components/order/cart-store";
import { customerAppMetadata } from "@/lib/pwa/metadata";

export const metadata = customerAppMetadata;

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
