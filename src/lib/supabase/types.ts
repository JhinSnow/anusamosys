export type ParticipantPublic = {
  id: string;
  smo_code: string;
  nickname: string;
  group_label: "A" | "B";
  interview_time: string;
  checked_in_at: string | null;
};

// Staff-only (behind /staff auth) — includes student_id, unlike ParticipantPublic.
export type StaffCheckinRow = {
  id: string;
  smo_code: string;
  nickname: string;
  student_id: string;
  checked_in_at: string | null;
};

export type ParticipantTotal = {
  participant_id: string;
  smo_code: string;
  nickname: string;
  total_score: number;
};

export type ScoreEntry = {
  id: string;
  participant_id: string;
  amount: number;
  reason: string | null;
  staff_name: string;
  created_at: string;
};
