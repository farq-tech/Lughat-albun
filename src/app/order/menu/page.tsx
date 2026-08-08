import { MenuView, type MenuPayload } from "@/components/order/menu-view";
import { Button } from "@/components/ui/button";
import { getMenu } from "@/server/services/menu";

type PageProps = {
  searchParams: Promise<{ source?: string }>;
};

function SystemPreparing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-display text-2xl text-[var(--ink)]">لغة البن</p>
      <p className="mt-8 text-lg text-[var(--ink-muted)]">النظام قيد التجهيز</p>
      <Button asLink href="/order" variant="secondary" className="mt-8">
        رجوع
      </Button>
    </main>
  );
}

export default async function MenuPage({ searchParams }: PageProps) {
  const { source } = await searchParams;
  const orderSource = source === "qr" ? "qr" : "link";

  let menu: Awaited<ReturnType<typeof getMenu>> | null = null;

  try {
    menu = await getMenu();
  } catch {
    return <SystemPreparing />;
  }

  const payload: MenuPayload = {
    categories: menu.categories,
    products: menu.products,
    groups: menu.groups,
    productGroups: Object.fromEntries(menu.productGroups),
  };

  return (
    <MenuView menu={payload} source={orderSource} />
  );
}
