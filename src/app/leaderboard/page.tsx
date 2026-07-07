import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Leaderboard } from "./Leaderboard";
import { BackLink } from "@/components/BackLink";
import type { ParticipantTotal } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("participant_totals")
    .select("participant_id, smo_code, nickname, total_score")
    .order("total_score", { ascending: false })
    .order("smo_code", { ascending: true })
    .returns<ParticipantTotal[]>();

  return (
    <main
      className="lb-scope min-h-full flex-1 px-6 py-10"
      style={{ background: "var(--lb-bg)" }}
    >
      <BackLink
        href="/"
        label="กลับหน้าแรก"
        colorClassName="text-[var(--lb-muted)] hover:text-[var(--lb-ink)] hover:bg-black/5 active:bg-black/10"
      />
      <div className="mt-6 flex flex-col items-center">
        {error ? (
          <p
            className="w-full max-w-2xl rounded-lg border border-error px-5 py-4 text-error"
            style={{ background: "color-mix(in oklch, var(--color-error) 12%, transparent)" }}
          >
            โหลดอันดับไม่สำเร็จ: {error.message}
          </p>
        ) : (
          <Leaderboard initialRanking={data ?? []} />
        )}
      </div>
    </main>
  );
}
