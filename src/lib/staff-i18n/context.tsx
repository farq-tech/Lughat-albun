"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

export function StaffLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<StaffLocale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STAFF_LOCALE_STORAGE_KEY);
      if (isStaffLocale(stored)) {
        setLocaleState(stored);
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const setLocale = useCallback((next: StaffLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STAFF_LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore
    }
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
        data-staff-i18n-ready={ready ? "1" : "0"}
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
