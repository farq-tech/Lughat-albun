import Image from "next/image";
import Link from "next/link";
import { customerAppMetadata } from "@/lib/pwa/metadata";

export const metadata = {
  ...customerAppMetadata,
  title: "تطبيقات لغة البن",
  description: "ثبّت تطبيق العملاء أو تطبيق الطاقم على الشاشة الرئيسية",
};

function InstallSteps({ label }: { label: string }) {
  return (
    <ol className="mt-3 list-decimal space-y-1.5 pe-5 text-sm text-[var(--ink-muted)]">
      <li>افتح رابط {label} من سفاري على الآيفون</li>
      <li>اضغط زر المشاركة في الأسفل</li>
      <li>اختر «إضافة إلى الشاشة الرئيسية»</li>
      <li>أكّد الإضافة</li>
    </ol>
  );
}

export default function AppsHubPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-10">
      <header className="mb-10 text-center">
        <Image
          src="/brand/lughat-albun-logo-circle.png"
          alt="لغة البن"
          width={96}
          height={96}
          className="mx-auto size-24 rounded-full object-cover"
          priority
        />
        <h1 className="mt-5 font-display text-3xl text-[var(--ink)]">
          تطبيقات لغة البن
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          تطبيقين منفصلين على الآيفون — واحد للعملاء وواحد للستاف والأدمن
        </p>
      </header>

      <div className="space-y-5">
        <section className="ui-panel p-5">
          <div className="flex items-center gap-3">
            <Image
              src="/icons/customer/apple-touch-icon.png"
              alt=""
              width={56}
              height={56}
              className="size-14 rounded-[14px]"
            />
            <div>
              <h2 className="text-lg font-semibold">تطبيق العملاء</h2>
              <p className="text-sm text-[var(--ink-muted)]">لغة البن</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            للطلب من السيارة وتتبع الطلب.
          </p>
          <InstallSteps label="العملاء" />
          <Link
            href="/apps/customer"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
          >
            افتح تطبيق العملاء
          </Link>
        </section>

        <section className="ui-panel p-5">
          <div className="flex items-center gap-3">
            <Image
              src="/icons/ops/apple-touch-icon.png"
              alt=""
              width={56}
              height={56}
              className="size-14 rounded-[14px]"
            />
            <div>
              <h2 className="text-lg font-semibold">تطبيق الطاقم</h2>
              <p className="text-sm text-[var(--ink-muted)]">ستاف + أدمن</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            طابور المطبخ، تفاصيل الطلبات، وإدارة المنيو.
          </p>
          <InstallSteps label="الطاقم" />
          <Link
            href="/apps/ops"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--elevated)] px-4 py-3 text-sm font-semibold text-[var(--ink)]"
          >
            افتح تطبيق الطاقم
          </Link>
        </section>
      </div>
    </main>
  );
}
