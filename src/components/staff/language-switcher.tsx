"use client";

import { STAFF_LOCALES, useStaffI18n } from "@/lib/staff-i18n";

type LanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
};

export function LanguageSwitcher({
  className,
  compact = false,
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useStaffI18n();

  return (
    <div className={className}>
      {!compact ? (
        <p className="mb-1.5 text-xs font-medium text-[var(--ink-muted)]">
          {t.language.label}
        </p>
      ) : null}
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={t.language.label}
      >
        {STAFF_LOCALES.map((code) => {
          const selected = locale === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--line)] bg-[var(--elevated)] text-[var(--ink)] hover:border-[var(--accent)]/40"
              }`}
              aria-pressed={selected}
            >
              {t.language[code]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
