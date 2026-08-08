import Image from "next/image";
import Link from "next/link";
import { customerAppMetadata } from "@/lib/pwa/metadata";

export const metadata = {
  ...customerAppMetadata,
  title: "لغات البن",
  description: "ثبّت تطبيق العملاء على الشاشة الرئيسية",
};

export default function CustomerAppInstallPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center px-6 py-12 text-center">
      <Image
        src="/icons/customer/apple-touch-icon.png"
        alt="لغات البن"
        width={120}
        height={120}
        className="size-[7.5rem] rounded-[28px] shadow-sm"
        priority
      />
      <h1 className="mt-6 font-display text-3xl text-[var(--ink)]">لغات البن</h1>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        تطبيق العملاء — اطلب من السيارة
      </p>

      <ol className="mt-8 w-full space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--elevated)]/70 p-5 text-start text-sm text-[var(--ink)]">
        <li>1. من سفاري: اضغط مشاركة</li>
        <li>2. اختر «إضافة إلى الشاشة الرئيسية»</li>
        <li>3. الاسم: لغات البن — ثم إضافة</li>
      </ol>

      <Link
        href="/order?source=app"
        className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white"
      >
        ابدأ الطلب
      </Link>
      <Link
        href="/apps"
        className="mt-3 text-sm text-[var(--accent)] hover:underline"
      >
        كل التطبيقات
      </Link>
    </main>
  );
}
