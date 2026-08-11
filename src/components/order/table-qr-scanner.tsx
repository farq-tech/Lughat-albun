"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { parseTableTokenFromScan } from "@/domains/tables/tokens";
import { Button } from "@/components/ui/button";

type ScanState = "starting" | "scanning" | "denied" | "unsupported" | "error";

export function TableQrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledRef = useRef(false);
  const [state, setState] = useState<ScanState>("starting");
  const [message, setMessage] = useState<string | null>(null);

  const goToTable = useCallback(
    (token: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      controlsRef.current?.stop();
      router.replace(`/order/table/enter?table=${encodeURIComponent(token)}`);
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);

    async function start() {
      if (!videoRef.current) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }

      try {
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result, _error, ctrl) => {
            controlsRef.current = ctrl;
            if (cancelled || handledRef.current || !result) return;
            const text = result.getText();
            const token = parseTableTokenFromScan(text);
            if (!token) {
              setMessage("هذا مو QR طاولة — وجّه الكاميرا لملصق الطاولة");
              return;
            }
            setMessage(null);
            goToTable(token);
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setState("scanning");
      } catch (e) {
        const name = e && typeof e === "object" && "name" in e ? String(e.name) : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setState("denied");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setState("unsupported");
        } else {
          setState("error");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [goToTable]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/order"
          className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          ← رجوع
        </Link>
        <p className="font-display text-lg text-[var(--ink)]">مسح الطاولة</p>
        <span className="w-10" aria-hidden />
      </header>

      <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--ink)] shadow-sm">
        <video
          ref={videoRef}
          className="aspect-[3/4] w-full object-cover"
          muted
          playsInline
          autoPlay
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-52 w-52 rounded-3xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {state === "starting" ? (
          <p className="absolute inset-x-0 bottom-4 text-center text-sm text-white/90">
            جاري فتح الكاميرا…
          </p>
        ) : null}
      </div>

      <section className="mt-5 space-y-3 text-center">
        <h1 className="font-display text-2xl text-[var(--ink)]">
          صوّب على QR الطاولة
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">
          الملصق على الطاولة — بعد المسح نفتح المنيو لنفس الطاولة
        </p>

        {message ? (
          <p className="rounded-xl bg-[var(--accent)]/10 px-4 py-3 text-sm text-[var(--accent)]" role="status">
            {message}
          </p>
        ) : null}

        {state === "denied" ? (
          <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-4 text-sm">
            <p className="text-[var(--ink)]">
              لازم تسمح بالكاميرا عشان نمسح رمز الطاولة.
            </p>
            <p className="text-[var(--ink-muted)]">
              من إعدادات المتصفح → الكاميرا → السماح، بعدين حدّث الصفحة.
            </p>
            <Button
              type="button"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              حاول مرة ثانية
            </Button>
          </div>
        ) : null}

        {state === "unsupported" || state === "error" ? (
          <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-4 text-sm">
            <p className="text-[var(--ink)]">
              الكاميرا غير متاحة على هذا الجهاز.
            </p>
            <p className="text-[var(--ink-muted)]">
              امسح ملصق الطاولة بكاميرا الجوال مباشرة، أو اطلب مساعدة الموظف.
            </p>
            <Button asLink href="/order" variant="secondary" className="w-full">
              رجوع للاختيار
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
