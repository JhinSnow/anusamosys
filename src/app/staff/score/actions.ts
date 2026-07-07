"use server";

import { revalidatePath } from "next/cache";
import { getStaffSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type SubmitScoreResult =
  | { ok: true; newTotal: number }
  | { ok: false; error: string };

export async function submitScore(
  participantId: string,
  amount: number,
  reason: string,
  staffName: string
): Promise<SubmitScoreResult> {
  const session = await getStaffSession();
  if (!session) {
    return { ok: false, error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }

  if (!Number.isInteger(amount) || amount === 0) {
    return { ok: false, error: "จำนวนคะแนนไม่ถูกต้อง" };
  }

  const trimmedStaffName = staffName.trim();
  if (!trimmedStaffName) {
    return { ok: false, error: "กรอกชื่อผู้ให้คะแนนก่อน" };
  }

  const supabase = await getSupabaseServerClient();

  const { error: insertError } = await supabase.from("score_entries").insert({
    participant_id: participantId,
    amount,
    reason: reason.trim() || null,
    staff_name: trimmedStaffName,
  });

  if (insertError) return { ok: false, error: insertError.message };

  const { data: totalRow, error: totalError } = await supabase
    .from("participant_totals")
    .select("total_score")
    .eq("participant_id", participantId)
    .single();

  if (totalError) return { ok: false, error: totalError.message };

  revalidatePath("/staff/score");
  return { ok: true, newTotal: totalRow.total_score as number };
}

export type SubmitBulkScoreResult =
  | { ok: true; updatedTotals: Record<string, number> }
  | { ok: false; error: string };

export async function submitBulkScore(
  participantIds: string[],
  amount: number,
  reason: string,
  staffName: string
): Promise<SubmitBulkScoreResult> {
  const session = await getStaffSession();
  if (!session) {
    return { ok: false, error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }

  if (participantIds.length === 0) {
    return { ok: false, error: "เลือกผู้สมัครอย่างน้อย 1 คน" };
  }

  if (!Number.isInteger(amount) || amount === 0) {
    return { ok: false, error: "จำนวนคะแนนไม่ถูกต้อง" };
  }

  const trimmedStaffName = staffName.trim();
  if (!trimmedStaffName) {
    return { ok: false, error: "กรอกชื่อผู้ให้คะแนนก่อน" };
  }

  const supabase = await getSupabaseServerClient();
  const trimmedReason = reason.trim() || null;

  // One row per participant — each score stays independently attributed
  // and shows up in that participant's own history, same as a single give.
  const { error: insertError } = await supabase.from("score_entries").insert(
    participantIds.map((participantId) => ({
      participant_id: participantId,
      amount,
      reason: trimmedReason,
      staff_name: trimmedStaffName,
    }))
  );

  if (insertError) return { ok: false, error: insertError.message };

  const { data: totals, error: totalsError } = await supabase
    .from("participant_totals")
    .select("participant_id, total_score")
    .in("participant_id", participantIds);

  if (totalsError) return { ok: false, error: totalsError.message };

  const updatedTotals: Record<string, number> = {};
  for (const row of totals ?? []) {
    updatedTotals[row.participant_id as string] = row.total_score as number;
  }

  revalidatePath("/staff/score");
  return { ok: true, updatedTotals };
}

export type ScoreHistoryEntry = {
  id: string;
  amount: number;
  reason: string | null;
  staff_name: string | null;
  created_at: string;
};

export type ScoreHistoryResult =
  | { ok: true; entries: ScoreHistoryEntry[] }
  | { ok: false; error: string };

export async function getScoreHistory(participantId: string): Promise<ScoreHistoryResult> {
  const session = await getStaffSession();
  if (!session) {
    return { ok: false, error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("score_entries")
    .select("id, amount, reason, staff_name, created_at")
    .eq("participant_id", participantId)
    .order("created_at", { ascending: false })
    .returns<ScoreHistoryEntry[]>();

  if (error) return { ok: false, error: error.message };
  return { ok: true, entries: data ?? [] };
}
