"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type LoginFormProps = {
  redirectTo: string;
  title: string;
  subtitle?: string;
  brand?: string;
  labels?: {
    email?: string;
    password?: string;
    submit?: string;
    invalidCredentials?: string;
  };
};

export function LoginForm({
  redirectTo,
  title,
  subtitle,
  brand = "لغة البن",
  labels,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(
        labels?.invalidCredentials ?? "البريد أو كلمة المرور غير صحيحة",
      );
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="ui-panel w-full max-w-sm space-y-4 p-6">
      <div className="space-y-1 text-center">
        <p className="font-display text-sm text-[var(--ink-muted)]">{brand}</p>
        <h1 className="font-display text-2xl font-bold text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-[var(--ink-muted)]">{subtitle}</p>
        ) : null}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--ink)]">
          {labels?.email ?? "البريد / اسم المستخدم"}
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ui-input"
          dir="ltr"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--ink)]">
          {labels?.password ?? "كلمة المرور"}
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ui-input"
          dir="ltr"
        />
      </label>

      {error ? (
        <p
          className="rounded-xl bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "..." : (labels?.submit ?? "تسجيل الدخول")}
      </Button>
    </form>
  );
}
