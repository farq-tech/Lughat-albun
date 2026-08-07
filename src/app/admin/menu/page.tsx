import { redirect } from "next/navigation";
import { getAdminMenu } from "@/server/services/admin";
import { DomainError } from "@/server/services/checkout";
import { AdminMenuView } from "./admin-menu-view";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  let categories;
  let products;
  try {
    const menu = await getAdminMenu();
    categories = menu.categories;
    products = menu.products;
  } catch (e) {
    if (
      e instanceof DomainError &&
      (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN")
    ) {
      redirect("/admin/login");
    }
    throw e;
  }
  return <AdminMenuView categories={categories} products={products} />;
}
