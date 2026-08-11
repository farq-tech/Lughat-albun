import { cookies } from "next/headers";
import { MenuView, type MenuPayload } from "@/components/order/menu-view";
import { Button } from "@/components/ui/button";
import { getTableCookieName } from "@/lib/auth/customer-token";
import { getMenu } from "@/server/services/menu";
import { DomainError } from "@/server/domain-error";
import { resolveTableByToken } from "@/server/services/tables";

type PageProps = {
  searchParams: Promise<{ source?: string; table?: string }>;
};

function SystemPreparing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-display text-2xl text-[var(--ink)]">لغات البن</p>
      <p className="mt-8 text-lg text-[var(--ink-muted)]">النظام قيد التجهيز</p>
      <Button asLink href="/order" variant="secondary" className="mt-8">
        رجوع
      </Button>
    </main>
  );
}

function TableError({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-display text-2xl text-[var(--ink)]">لغات البن</p>
      <p className="mt-8 text-lg text-[var(--ink-muted)]">{message}</p>
      <Button asLink href="/order" variant="secondary" className="mt-8">
        طلب من السيارة
      </Button>
    </main>
  );
}

export default async function MenuPage({ searchParams }: PageProps) {
  const { source, table: tableTokenParam } = await searchParams;
  const cookieStore = await cookies();
  const tableToken =
    tableTokenParam?.trim() ||
    cookieStore.get(getTableCookieName())?.value ||
    null;

  let tableLabel: string | null = null;
  let orderType: "CURBSIDE" | "DINE_IN" = "CURBSIDE";
  let orderSource: "qr" | "link" = source === "qr" ? "qr" : "link";

  if (tableToken) {
    try {
      const table = await resolveTableByToken(tableToken);
      tableLabel = table.label;
      orderType = "DINE_IN";
      orderSource = "qr";
    } catch (e) {
      if (e instanceof DomainError) {
        return <TableError message={e.message} />;
      }
      return <TableError message="ما قدرنا نفتح الطاولة" />;
    }
  }

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
    <MenuView
      menu={payload}
      source={orderSource}
      orderType={orderType}
      tableLabel={tableLabel}
      tableToken={orderType === "DINE_IN" ? tableToken : null}
    />
  );
}
