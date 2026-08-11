"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

export default function AdminQrPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const orderUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/order/menu?source=qr`
      : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/order/menu?source=qr`;

  useEffect(() => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/order/menu?source=qr`
        : "/order/menu?source=qr";

    void QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: "#1c1410", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, []);

  function handlePrint() {
    window.print();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-[var(--accent)] hover:underline print:hidden"
      >
        ← رجوع
      </Link>

      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">رمز QR للطلب</h1>
        <Button onClick={handlePrint}>طباعة</Button>
      </div>

      <div
        ref={printRef}
        className="qr-print-sheet mx-auto flex flex-col items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-10 text-center shadow-sm print:border-0 print:shadow-none"
      >
        <p className="font-display text-4xl font-bold tracking-tight text-[var(--ink)]">
          لغات البن
        </p>
        <p className="mt-3 text-2xl font-semibold text-[var(--ink)]">
          اطلب من سيارتك
        </p>
        <p className="mt-4 max-w-xs text-lg leading-relaxed text-[var(--ink-muted)]">
          امسح الكود واطلب
        </p>

        <div className="my-8 rounded-2xl border-2 border-[var(--accent)] p-3">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR code for ordering"
              width={280}
              height={280}
              className="block"
            />
          ) : (
            <div className="flex h-[280px] w-[280px] items-center justify-center bg-[var(--surface-2)] text-sm text-[var(--ink-muted)]">
              جاري التحميل…
            </div>
          )}
        </div>

        <p className="text-lg font-medium text-[var(--accent)]">
          قهوتك توصلك لسيارتك
        </p>

        <p className="mt-8 hidden text-xs text-[var(--ink-muted)] print:block" dir="ltr">
          {orderUrl}
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .qr-print-sheet,
          .qr-print-sheet * {
            visibility: visible;
          }
          .qr-print-sheet {
            position: fixed;
            inset: 0;
            margin: auto;
            width: 148mm;
            min-height: 210mm;
            max-height: 210mm;
            page-break-after: avoid;
          }
          @page {
            size: A5 portrait;
            margin: 12mm;
          }
        }
      `}</style>
    </main>
  );
}
