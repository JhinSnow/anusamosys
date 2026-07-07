"use server";

import { revalidatePath } from "next/cache";
import { getStaffSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CheckInResult =
  | { ok: true; checkedInAt: string }
  | { ok: false; error: string };

export async function checkInParticipant(
  participantId: string,
  { force = false }: { force?: boolean } = {}
): Promise<CheckInResult> {
  const session = await getStaffSession();
  if (!session) {
    return { ok: false, error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }

  const supabase = await getSupabaseServerClient();

  if (!force) {
    const { data: existing, error: fetchError } = await supabase
      .from("participants")
      .select("checked_in_at")
      .eq("id", participantId)
      .single();

    if (fetchError) return { ok: false, error: fetchError.message };
    if (existing?.checked_in_at) {
      // Already checked in — caller must confirm and retry with force: true.
      return { ok: true, checkedInAt: existing.checked_in_at };
    }
  }

  const checkedInAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("participants")
    .update({ checked_in_at: checkedInAt })
    .eq("id", participantId)
    .select("checked_in_at")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/staff/checkin");
  return { ok: true, checkedInAt: data.checked_in_at as string };
}

export type RemoveCheckInResult = { ok: true } | { ok: false; error: string };

export async function removeCheckIn(participantId: string): Promise<RemoveCheckInResult> {
  const session = await getStaffSession();
  if (!session) {
    return { ok: false, error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("participants")
    .update({ checked_in_at: null })
    .eq("id", participantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/staff/checkin");
  return { ok: true };
}
