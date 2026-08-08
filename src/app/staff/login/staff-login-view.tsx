"use client";

import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/staff/language-switcher";
import { useStaffI18n } from "@/lib/staff-i18n";

export function StaffLoginView() {
  const { t } = useStaffI18n();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-6 w-full max-w-sm">
        <LanguageSwitcher />
      </div>
      <div className="mb-8 text-center">
        <p className="text-sm text-[var(--ink-muted,#6b5c4f)]">{t.brand}</p>
        <p className="text-lg font-semibold">{t.login.panelTitle}</p>
      </div>
      <LoginForm
        redirectTo="/staff"
        brand={t.brand}
        title={t.login.title}
        subtitle={t.login.subtitle}
        labels={{
          email: t.login.email,
          password: t.login.password,
          submit: t.login.submit,
          invalidCredentials: t.login.invalidCredentials,
        }}
      />
    </main>
  );
}
