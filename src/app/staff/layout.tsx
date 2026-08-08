export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-full text-[var(--ink)]">
      {children}
    </div>
  );
}
