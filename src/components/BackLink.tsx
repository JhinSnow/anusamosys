import Link from "next/link";
import { cn } from "@/lib/cn";

export function BackLink({
  href,
  label = "ย้อนกลับ",
  colorClassName = "text-muted hover:text-ink hover:bg-black/5 active:bg-black/10",
}: {
  href: string;
  label?: string;
  colorClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-ml-3 inline-flex h-11 w-fit items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
        colorClassName
      )}
    >
      <span aria-hidden className="text-base">
        ←
      </span>
      {label}
    </Link>
  );
}
