import Link from "next/link";
import { redirect } from "next/navigation";
import { formatSar } from "@/lib/money";
import { getAdminDashboardStats } from "@/server/services/admin";
import { DomainError } from "@/server/services/checkout";

export default async function AdminPage() {
  let stats: Awaited<ReturnType<typeof getAdminDashboardStats>> | null = null;

  try {
    stats = await getAdminDashboardStats();
  } catch (e) {
    if (
      e instanceof DomainError &&
      (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN")
    ) {
      redirect("/admin/login");
    }
    stats = {
      todayOrders: null,
      todayRevenueMinor: null,
      statsAvailable: false,
    };
  }

  const links = [
    { href: "/admin/qr", title: "رمز QR", desc: "طباعة ملصق الطلب بالسيارة" },
    { href: "/admin/menu", title: "المنيو", desc: "عرض الأصناف وتوفرها" },
    { href: "/staff", title: "طابور الموظفين", desc: "الانتقال لواجهة التشغيل" },
  ];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">لوحة الإدارة</h1>
        <p className="text-[var(--ink-muted)]">لغة البن — نظرة عامة</p>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <p className="text-sm text-[var(--ink-muted)]">طلبات اليوم</p>
          <p className="mt-1 text-3xl font-bold">
            {stats.statsAvailable && stats.todayOrders !== null
              ? stats.todayOrders
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <p className="text-sm text-[var(--ink-muted)]">إيراد اليوم</p>
          <p className="mt-1 text-3xl font-bold">
            {stats.statsAvailable && stats.todayRevenueMinor !== null
              ? formatSar(stats.todayRevenueMinor)
              : "—"}
          </p>
        </div>
      </section>

      <nav className="space-y-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-2xl border border-[var(--line)] bg-white p-5 transition hover:border-[var(--accent)] hover:shadow-sm"
          >
            <h2 className="text-lg font-bold">{link.title}</h2>
            <p className="text-sm text-[var(--ink-muted)]">{link.desc}</p>
          </Link>
        ))}
      </nav>
    </main>
  );
}
