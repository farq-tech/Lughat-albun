"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  createCafeTableAction,
  rotateTableQrAction,
  setCafeTableActiveAction,
  listAdminTablesAction,
} from "@/server/actions/tables";
import type { AdminTableRow } from "@/server/services/tables";

type AdminTablesViewProps = {
  initialTables: AdminTableRow[];
};

export function AdminTablesView({ initialTables }: AdminTablesViewProps) {
  const [tables, setTables] = useState(initialTables);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState("");
  const [selected, setSelected] = useState<AdminTableRow | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [freshTokenNote, setFreshTokenNote] = useState<string | null>(null);

  const nextSuggested = useMemo(() => {
    const max = tables.reduce((m, t) => Math.max(m, t.table_number), 0);
    return String(max + 1);
  }, [tables]);

  function appOrigin() {
    if (typeof window !== "undefined") return window.location.origin;
    return process.env.NEXT_PUBLIC_APP_URL ?? "";
  }

  async function refresh() {
    const result = await listAdminTablesAction();
    if (result.ok) setTables(result.data);
  }

  function showQrForPath(menuPath: string, table: AdminTableRow) {
    const full = `${appOrigin()}${menuPath}`;
    setQrUrl(full);
    setSelected(table);
    setFreshTokenNote("رمز جديد — اطبع أو حمّل QR قبل إغلاق الصفحة.");
    void QRCode.toDataURL(full, {
      width: 280,
      margin: 2,
      color: { dark: "#1c1410", light: "#ffffff" },
    }).then(setQrDataUrl);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const tableNumber = Number(newNumber || nextSuggested);
    startTransition(async () => {
      const result = await createCafeTableAction({ tableNumber });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNewNumber("");
      await refresh();
      showQrForPath(result.data.menuPath, {
        ...result.data.table,
        open_session_id: null,
        active_order_count: 0,
        occupancy: "empty",
      });
    });
  }

  function handleRotate(table: AdminTableRow) {
    setError(null);
    startTransition(async () => {
      const result = await rotateTableQrAction({ tableId: table.id });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await refresh();
      showQrForPath(result.data.menuPath, table);
    });
  }

  function handleToggleActive(table: AdminTableRow) {
    setError(null);
    startTransition(async () => {
      const result = await setCafeTableActiveAction({
        tableId: table.id,
        isActive: !table.is_active,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await refresh();
    });
  }

  function handleDownload() {
    if (!qrDataUrl || !selected) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `table-${selected.table_number}-qr.png`;
    a.click();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-[var(--accent)] hover:underline"
      >
        ← رجوع
      </Link>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold">الطاولات</h1>
        <p className="mt-1 text-[var(--ink-muted)]">
          QR لكل طاولة → جلسة → طلب الطاولة
        </p>
      </header>

      <form
        onSubmit={handleCreate}
        className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-4"
      >
        <label className="space-y-1.5">
          <span className="text-sm font-medium">رقم طاولة جديدة</span>
          <input
            type="number"
            min={1}
            max={999}
            value={newNumber}
            placeholder={nextSuggested}
            onChange={(e) => setNewNumber(e.target.value)}
            className="ui-input w-28"
          />
        </label>
        <Button type="submit" disabled={pending}>
          إضافة + إنشاء QR
        </Button>
      </form>

      {error ? (
        <p
          className="mb-4 rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="bg-[var(--surface-2)] text-[var(--ink-muted)]">
            <tr>
              <th className="px-4 py-3 text-start font-medium">الطاولة</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
              <th className="px-4 py-3 text-start font-medium">QR</th>
            </tr>
          </thead>
          <tbody>
            {tables.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-10 text-center text-[var(--ink-muted)]"
                >
                  ما فيه طاولات بعد — أضف أول طاولة.
                </td>
              </tr>
            ) : (
              tables.map((table) => (
                <tr key={table.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-semibold">
                    {table.table_number}
                    {!table.is_active ? (
                      <span className="ms-2 text-xs font-normal text-[var(--ink-muted)]">
                        معطّلة
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {table.occupancy === "busy" ? (
                      <span className="text-[var(--accent)]">مشغولة</span>
                    ) : (
                      <span className="text-[var(--success)]">فارغة</span>
                    )}
                    {table.active_order_count > 0 ? (
                      <span className="ms-2 text-xs text-[var(--ink-muted)]">
                        {table.active_order_count} طلب
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => handleRotate(table)}
                      >
                        QR / تجديد
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => handleToggleActive(table)}
                      >
                        {table.is_active ? "تعطيل" : "تفعيل"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && qrDataUrl ? (
        <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-6 text-center">
          <h2 className="text-xl font-bold">طاولة {selected.table_number}</h2>
          {freshTokenNote ? (
            <p className="mt-2 text-sm text-[var(--accent)]">{freshTokenNote}</p>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR طاولة ${selected.table_number}`}
            width={280}
            height={280}
            className="mx-auto my-6 block"
          />
          {qrUrl ? (
            <p className="mb-4 break-all text-xs text-[var(--ink-muted)]" dir="ltr">
              {qrUrl}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={handleDownload}>
              تحميل QR
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              طباعة
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelected(null);
                setQrDataUrl(null);
                setQrUrl(null);
                setFreshTokenNote(null);
              }}
            >
              إغلاق
            </Button>
          </div>
        </section>
      ) : null}

      <p className="mt-6 text-sm text-[var(--ink-muted)]">
        ملصق السيارة العام ما زال على{" "}
        <Link href="/admin/qr" className="text-[var(--accent)] hover:underline">
          QR الطلب من السيارة
        </Link>
        .
      </p>
    </main>
  );
}
