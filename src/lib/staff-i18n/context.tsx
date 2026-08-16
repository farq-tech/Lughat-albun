"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MESSAGES } from "./messages";
import {
  LOCALE_META,
  STAFF_LOCALES,
  type StaffLocale,
  type StaffMessages,
} from "./types";

export const STAFF_LOCALE_STORAGE_KEY = "lab_staff_locale";

type StaffI18nContextValue = {
  locale: StaffLocale;
  setLocale: (locale: StaffLocale) => void;
  t: StaffMessages;
  dir: "ltr" | "rtl";
  timeLocale: string;
};

const StaffI18nContext = createContext<StaffI18nContextValue | null>(null);

function isStaffLocale(value: string | null | undefined): value is StaffLocale {
  return !!value && (STAFF_LOCALES as readonly string[]).includes(value);
}

function readStoredLocale(): StaffLocale {
  try {
    const stored = localStorage.getItem(STAFF_LOCALE_STORAGE_KEY);
    if (isStaffLocale(stored)) return stored;
  } catch {
    // ignore
  }
  return "en";
}

let memoryLocale: StaffLocale = "en";
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StaffLocale {
  if (!hydrated) {
    memoryLocale = readStoredLocale();
    hydrated = true;
  }
  return memoryLocale;
}

function getServerSnapshot(): StaffLocale {
  return "en";
}

function writeLocale(next: StaffLocale) {
  memoryLocale = next;
  hydrated = true;
  try {
    localStorage.setItem(STAFF_LOCALE_STORAGE_KEY, next);
  } catch {
    // ignore
  }
  emit();
}

export function StaffLocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setLocale = useCallback((next: StaffLocale) => {
    writeLocale(next);
  }, []);

  const value = useMemo<StaffI18nContextValue>(() => {
    const meta = LOCALE_META[locale];
    return {
      locale,
      setLocale,
      t: MESSAGES[locale],
      dir: meta.dir,
      timeLocale: meta.timeLocale,
    };
  }, [locale, setLocale]);

  return (
    <StaffI18nContext.Provider value={value}>
      <div
        lang={locale}
        dir={value.dir}
        className={`min-h-full text-[var(--ink)] ${
          locale === "hi"
            ? "font-[family-name:var(--font-staff-deva),var(--font-sans-ar),sans-serif]"
            : locale === "bn"
              ? "font-[family-name:var(--font-staff-beng),var(--font-sans-ar),sans-serif]"
              : locale === "en"
                ? "font-[family-name:var(--font-staff-sans),var(--font-sans-ar),sans-serif]"
                : ""
        }`}
        data-staff-locale={locale}
        data-staff-i18n-ready="1"
      >
        {children}
      </div>
    </StaffI18nContext.Provider>
  );
}

export function useStaffI18n(): StaffI18nContextValue {
  const ctx = useContext(StaffI18nContext);
  if (!ctx) {
    throw new Error("useStaffI18n must be used within StaffLocaleProvider");
  }
  return ctx;
}
