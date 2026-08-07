"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type LoginFormProps = {
  redirectTo: string;
  title: string;
  subtitle?: string;
};

export function LoginForm({ redirectTo, title, subtitle }: LoginFormProps) {
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
      setError("البريد أو كلمة المرور غير صحيحة");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-[var(--line,#e5e5e5)] bg-[var(--surface,#fff)] p-6 shadow-sm"
    >
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-[var(--ink,#171717)]">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-[var(--ink-muted,#666)]">{subtitle}</p>
        ) : null}
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-[var(--ink,#171717)]">
          البريد الإلكتروني
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-[var(--line,#e5e5e5)] bg-[var(--surface-2,#fafafa)] px-4 py-3 text-[var(--ink,#171717)] outline-none focus:border-[var(--accent,#8b4513)] focus:ring-2 focus:ring-[var(--accent,#8b4513)]/20"
          dir="ltr"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-[var(--ink,#171717)]">
          كلمة المرور
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-[var(--line,#e5e5e5)] bg-[var(--surface-2,#fafafa)] px-4 py-3 text-[var(--ink,#171717)] outline-none focus:border-[var(--accent,#8b4513)] focus:ring-2 focus:ring-[var(--accent,#8b4513)]/20"
          dir="ltr"
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-[var(--danger,#dc2626)]/10 px-3 py-2 text-sm text-[var(--danger,#dc2626)]">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "جاري الدخول…" : "تسجيل الدخول"}
      </Button>
    </form>
  );
}
