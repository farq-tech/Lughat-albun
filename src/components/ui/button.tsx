import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-12 px-5",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-105 active:scale-[0.98]",
        secondary:
          "bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--surface-3)]",
        ghost: "bg-transparent text-[var(--ink)] hover:bg-[var(--surface-2)]",
        danger: "bg-[var(--danger)] text-white hover:brightness-105",
      },
      size: {
        default: "min-h-12 px-5",
        sm: "min-h-10 px-4 text-sm",
        lg: "min-h-14 px-6 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asLink?: never;
  href?: never;
}

export interface ButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    VariantProps<typeof buttonVariants> {
  asLink: true;
  href: string;
}

export const Button = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps | ButtonLinkProps
>(({ className, variant, size, ...props }, ref) => {
  const classes = cn(buttonVariants({ variant, size }), className);

  if ("asLink" in props && props.asLink) {
    const { asLink, href, ...linkProps } = props;
    void asLink;
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...linkProps}
      />
    );
  }

  const buttonProps = props as ButtonProps;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={classes}
      {...buttonProps}
    />
  );
});
Button.displayName = "Button";
