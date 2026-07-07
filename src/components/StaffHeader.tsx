import { staffLogoutAction } from "@/app/staff/actions";
import { BackLink } from "@/components/BackLink";

export function StaffHeader({
  title,
  backHref,
  backLabel = "กลับไปเมนูเจ้าหน้าที่",
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {backHref && <BackLink href={backHref} label={backLabel} />}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <form action={staffLogoutAction}>
          <button
            type="submit"
            className="h-11 rounded-md border border-border-strong px-4 text-sm font-medium text-muted transition-colors duration-[var(--duration-fast)] hover:bg-surface hover:text-ink"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
    </div>
  );
}
