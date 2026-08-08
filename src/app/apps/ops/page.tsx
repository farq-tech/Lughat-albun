import Image from "next/image";
import Link from "next/link";
import { opsAppMetadata } from "@/lib/pwa/metadata";

export const metadata = {
  ...opsAppMetadata,
  title: "طاقم البن",
  description: "Staff + Admin app for Lughat Al-Bun",
};

export default function OpsAppHomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-12">
      <header className="mb-8 text-center">
        <Image
          src="/icons/ops/apple-touch-icon.png"
          alt="طاقم البن"
          width={112}
          height={112}
          className="mx-auto size-28 rounded-[26px] shadow-sm"
          priority
        />
        <h1 className="mt-5 font-display text-3xl text-[var(--ink)]">طاقم البن</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Staff + Admin · Lughat Al-Bun
        </p>
      </header>

      <section className="ui-panel mb-5 space-y-3 p-5">
        <h2 className="text-base font-semibold">Add to Home Screen (Safari)</h2>
        <ol className="list-decimal space-y-1.5 pe-5 text-sm text-[var(--ink-muted)]">
          <li>Tap Share</li>
          <li>Add to Home Screen</li>
          <li>Name: طاقم البن — Add</li>
        </ol>
      </section>

      <div className="grid gap-3">
        <Link
          href="/staff"
          className="rounded-xl bg-[var(--accent)] px-4 py-4 text-center text-sm font-semibold text-white"
        >
          Staff queue · طابور الطلبات
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-[var(--line)] bg-[var(--elevated)] px-4 py-4 text-center text-sm font-semibold text-[var(--ink)]"
        >
          Admin · الإدارة
        </Link>
        <Link
          href="/staff/login"
          className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 px-4 py-3 text-center text-sm text-[var(--ink-muted)]"
        >
          Staff login
        </Link>
        <Link
          href="/admin/login"
          className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 px-4 py-3 text-center text-sm text-[var(--ink-muted)]"
        >
          Admin login
        </Link>
      </div>

      <Link
        href="/apps"
        className="mt-8 text-center text-sm text-[var(--accent)] hover:underline"
      >
        كل التطبيقات
      </Link>
    </main>
  );
}
