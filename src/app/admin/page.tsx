import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminDashboardStats } from "@/server/services/admin";
import { DomainError } from "@/server/services/checkout";

export default async function AdminPage() {
  try {
    await getAdminDashboardStats();
  } catch (e) {
    if (
      e instanceof DomainError &&
      (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN")
    ) {
      redirect("/admin/login");
    }
  }

  const links = [
    { href: "/admin/qr", title: "QR الطلب", desc: "ملصق الطلب من السيارة" },
    { href: "/admin/menu", title: "إدارة المنيو", desc: "توفر الأصناف" },
    { href: "/staff", title: "طابور الموظفين", desc: "واجهة التشغيل" },
    { href: "/order", title: "فتح تجربة العميل", desc: "شاشة الطلب" },
  ];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-10">
        <h1 className="font-display text-3xl font-bold">لغات البن</h1>
        <p className="mt-1 text-[var(--ink-muted)]">تشغيل المحل — روابط سريعة</p>
      </header>

      <nav className="space-y-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="ui-panel flex items-center justify-between gap-4 p-5 transition hover:border-[var(--accent)]"
          >
            <div>
              <h2 className="text-xl font-semibold">{link.title}</h2>
              <p className="text-sm text-[var(--ink-muted)]">{link.desc}</p>
            </div>
            <span className="text-[var(--ink-muted)]" aria-hidden>
              ←
            </span>
          </Link>
        ))}
      </nav>

      <p className="mt-8 text-sm font-medium text-[var(--success)]">
        النظام: متصل · Asia/Riyadh
      </p>
    </main>
  );
}
