import { LoginForm } from "@/components/auth/login-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <p className="text-sm text-[var(--ink-muted,#6b5c4f)]">لغة البن</p>
        <p className="text-lg font-semibold">لوحة الإدارة</p>
      </div>
      <LoginForm
        redirectTo="/admin"
        title="تسجيل الدخول"
        subtitle="للمديرين المعتمدين فقط"
      />
    </main>
  );
}
