import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "primary";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning-ink",
  primary: "bg-primary-subtle text-primary",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
