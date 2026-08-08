import { SOCIAL } from "@/lib/brand/social";

type SocialLinksProps = {
  className?: string;
};

export function SocialLinks({ className }: SocialLinksProps) {
  return (
    <div className={className}>
      <p className="text-center text-xs tracking-[0.18em] text-[var(--ink-muted)] uppercase">
        {SOCIAL.handle}
      </p>
      <div className="mt-2 flex items-center justify-center gap-5">
        <a
          href={SOCIAL.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[var(--ink)] underline-offset-4 transition hover:text-[var(--accent)] hover:underline"
        >
          إنستغرام
        </a>
        <a
          href={SOCIAL.snapchatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[var(--ink)] underline-offset-4 transition hover:text-[var(--accent)] hover:underline"
        >
          سناب شات
        </a>
      </div>
    </div>
  );
}
