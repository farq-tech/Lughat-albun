export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="min-h-full bg-[var(--surface,#faf8f5)] text-[var(--ink,#1a120b)]"
      style={
        {
          "--accent": "var(--accent, #6f4e37)",
          "--accent-fg": "var(--accent-fg, #fff)",
          "--surface": "var(--surface, #faf8f5)",
          "--surface-2": "var(--surface-2, #f0ebe3)",
          "--surface-3": "var(--surface-3, #e8dfd4)",
          "--ink": "var(--ink, #1a120b)",
          "--ink-muted": "var(--ink-muted, #6b5c4f)",
          "--line": "var(--line, #ddd5ca)",
          "--danger": "var(--danger, #b42318)",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
