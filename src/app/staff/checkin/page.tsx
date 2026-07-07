import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { StaffHeader } from "@/components/StaffHeader";
import { CheckinList } from "./CheckinList";
import type { StaffCheckinRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function StaffCheckinPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff");

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, smo_code, nickname, student_id, checked_in_at")
    .order("sequence", { ascending: true })
    .returns<StaffCheckinRow[]>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <StaffHeader title="เช็คชื่อผู้สมัคร" backHref="/staff" />

      {error ? (
        <p className="rounded-lg border border-error bg-error-subtle px-5 py-4 text-error">
          โหลดรายชื่อไม่สำเร็จ: {error.message}
        </p>
      ) : (
        <CheckinList initialParticipants={data ?? []} />
      )}
    </main>
  );
}
