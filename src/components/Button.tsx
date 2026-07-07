import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-ink hover:bg-primary-strong active:bg-primary-strong disabled:bg-border disabled:text-muted",
  secondary:
    "bg-bg text-ink border border-border-strong hover:bg-surface active:bg-surface-2 disabled:text-muted disabled:border-border",
  ghost:
    "bg-transparent text-ink hover:bg-surface active:bg-surface-2 disabled:text-muted",
  success:
    "bg-success text-success-ink hover:brightness-95 active:brightness-90 disabled:bg-border disabled:text-muted",
  danger:
    "bg-error text-error-ink hover:brightness-95 active:brightness-90 disabled:bg-border disabled:text-muted",
};

// Minimum 44px tap target on every size — staff operate this standing up,
// tapping a shared tablet, often one-handed between greeting arrivals.
const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-11 px-4 text-sm gap-1.5",
  md: "h-12 px-5 text-base gap-2",
  lg: "h-14 px-7 text-md gap-2.5",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] disabled:cursor-not-allowed cursor-pointer",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}
