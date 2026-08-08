import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import {
  CUSTOMER_PRESENCE_LABELS,
  type CustomerPresence,
} from "@/domains/orders/customer-presence";
import { staffStatusLabel } from "@/domains/orders/state-machine";
import type { OrderStatus, PaymentMethod } from "@/types/database";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium leading-none",
  {
    variants: {
      tone: {
        ink: "bg-[var(--surface-2)] text-[var(--ink)]",
        muted: "bg-[var(--surface-2)] text-[var(--ink-muted)]",
        accent:
          "border border-[var(--accent)]/35 bg-[var(--surface-2)] text-[var(--accent)]",
        success: "bg-[var(--success)] text-white",
        danger: "bg-[var(--danger)]/10 text-[var(--danger)]",
        cod: "border border-[var(--cod-amber)] bg-[var(--elevated)] text-[var(--ink)]",
        outside:
          "border border-[var(--accent)] bg-[var(--elevated)] text-[var(--ink)]",
        ready: "bg-[var(--success)] text-white",
      },
    },
    defaultVariants: { tone: "ink" },
  },
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    dot?: "accent" | "cod" | "success" | "none";
  };

export function Badge({
  className,
  tone,
  dot = "none",
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot !== "none" ? (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            dot === "accent" && "bg-[var(--accent)]",
            dot === "cod" && "bg-[var(--cod-amber)]",
            dot === "success" && "bg-white",
          )}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}

export function PaymentBadge({
  paymentMethod,
  paymentStatus,
  className,
  labels,
}: {
  paymentMethod?: PaymentMethod | string | null;
  paymentStatus?: string | null;
  className?: string;
  labels?: { cod?: string; paid?: string };
}) {
  if (paymentMethod === "CASH_ON_DELIVERY") {
    return (
      <Badge tone="cod" dot="cod" className={className}>
        {labels?.cod ?? "الدفع عند الاستلام"}
      </Badge>
    );
  }
  if (paymentStatus === "PAID" || paymentMethod) {
    return (
      <Badge tone="success" className={className}>
        {labels?.paid ?? "مدفوع"}
      </Badge>
    );
  }
  return null;
}

export function ArrivalBadge({
  presence,
  className,
  label: labelOverride,
}: {
  presence: CustomerPresence;
  className?: string;
  label?: string;
}) {
  const label = labelOverride ?? CUSTOMER_PRESENCE_LABELS[presence];
  if (presence === "outside" || presence === "claimed_received") {
    return (
      <Badge tone="outside" dot="accent" className={cn("font-semibold", className)}>
        {label}
      </Badge>
    );
  }
  if (presence === "on_the_way") {
    return (
      <Badge tone="accent" className={className}>
        {label}
      </Badge>
    );
  }
  return (
    <Badge tone="muted" className={className}>
      {label}
    </Badge>
  );
}

export function KitchenBadge({
  status,
  className,
  label: labelOverride,
}: {
  status: OrderStatus;
  className?: string;
  label?: string;
}) {
  const label = labelOverride ?? staffStatusLabel(status);
  if (status === "READY") {
    return (
      <Badge tone="ready" className={className}>
        {label}
      </Badge>
    );
  }
  if (status === "DELIVERED") {
    return (
      <Badge tone="muted" className={className}>
        {label}
      </Badge>
    );
  }
  if (status === "PREPARING" || status === "ACCEPTED") {
    return (
      <Badge tone="ink" className={className}>
        {label}
      </Badge>
    );
  }
  return (
    <Badge tone="ink" className={className}>
      {label}
    </Badge>
  );
}
