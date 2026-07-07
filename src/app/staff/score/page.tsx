import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { StaffHeader } from "@/components/StaffHeader";
import { ScorePanel } from "./ScorePanel";
import type { ParticipantTotal } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function StaffScorePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/staff");

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("participant_totals")
    .select("participant_id, smo_code, nickname, total_score")
    .order("smo_code", { ascending: true })
    .returns<ParticipantTotal[]>();

  const { ids } = await searchParams;
  const initialSelectedIds = ids ? ids.split(",").filter(Boolean) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <StaffHeader title="ให้คะแนนผู้สมัคร" backHref="/staff" />

      {error ? (
        <p className="rounded-lg border border-error bg-error-subtle px-5 py-4 text-error">
          โหลดรายชื่อไม่สำเร็จ: {error.message}
        </p>
      ) : (
        <ScorePanel initialParticipants={data ?? []} initialSelectedIds={initialSelectedIds} />
      )}
    </main>
  );
}
