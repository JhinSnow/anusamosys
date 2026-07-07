import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function TextField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: TextFieldProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "h-12 rounded-md border border-border-strong bg-bg px-4 text-base text-ink placeholder:text-muted",
          "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1",
          error && "border-error",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
