// One-off import: match student IDs from the activity attendance text files
// against participants.student_id, and award points for each match.
//
// Usage:
//   npx tsx scripts/import-activities.ts            (dry run — no writes)
//   npx tsx scripts/import-activities.ts --commit    (actually inserts)
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const FOLDER = join(process.cwd(), "รายชื่อน้องที่เข้าร่วมกิจกรรม");

const ACTIVITIES = [
  { file: "กิจกรรมรับน้อง.txt", label: "กิจกรรมรับน้อง", amount: 58 },
  { file: "กิจกรรมไหว้ครู.txt", label: "กิจกรรมไหว้ครู", amount: 25 },
  { file: "กิจกรรมบำเพ็ญ.txt", label: "กิจกรรมบำเพ็ญ", amount: 22 },
];

const STAFF_NAME_PREFIX = "นำเข้า: ";

// U+200B zero-width space — confirmed present in กิจกรรมไหว้ครู.txt via a
// codepoint scan; built from \u escape (not a pasted literal) so it's
// unambiguous and verifiable.
const ZERO_WIDTH_SPACE_RE = new RegExp("​", "g");

function parseStudentIds(raw: string): string[] {
  // Strip invisible/zero-width characters that show up in some exports,
  // then split on ANY whitespace (handles one-per-line files and the
  // single-line space-separated file the same way), keep only tokens
  // that are purely numeric, and drop the header token if it slipped in.
  const cleaned = raw.replace(ZERO_WIDTH_SPACE_RE, "");
  const tokens = cleaned.split(/\s+/).map((t) => t.trim()).filter(Boolean);
  const ids = tokens.filter((t) => /^\d+$/.test(t) && t !== "รหัสนักศึกษา");
  return Array.from(new Set(ids));
}

async function main() {
  const commit = process.argv.includes("--commit");
  console.log(commit ? "*** COMMIT MODE — will write to the database ***" : "DRY RUN — no writes will happen");
  console.log();

  const { data: participants, error } = await supabase
    .from("participants")
    .select("id, smo_code, student_id");
  if (error) throw error;

  const byStudentId = new Map(participants!.map((p) => [p.student_id, p]));

  let grandTotalMatches = 0;
  const toInsert: { participant_id: string; amount: number; reason: string; staff_name: string }[] = [];

  for (const activity of ACTIVITIES) {
    const path = join(FOLDER, activity.file);
    const raw = readFileSync(path, "utf-8");
    const ids = parseStudentIds(raw);

    const matched: { smo_code: string; student_id: string }[] = [];
    const unmatchedIds: string[] = [];

    for (const id of ids) {
      const participant = byStudentId.get(id);
      if (participant) {
        matched.push({ smo_code: participant.smo_code, student_id: id });
        toInsert.push({
          participant_id: participant.id,
          amount: activity.amount,
          reason: activity.label,
          staff_name: `${STAFF_NAME_PREFIX}${activity.label}`,
        });
      } else {
        unmatchedIds.push(id);
      }
    }

    console.log(`--- ${activity.label} (+${activity.amount} คะแนน) ---`);
    console.log(`  ไฟล์มีรหัสทั้งหมด: ${ids.length} รายการ (unique)`);
    console.log(`  ตรงกับผู้สมัครในระบบ: ${matched.length} คน`);
    console.log(`  ไม่พบในระบบ: ${unmatchedIds.length} รายการ`);
    console.log(
      `  ผู้สมัครที่ตรง: ${matched.map((m) => m.smo_code).sort().join(", ")}`
    );
    console.log();

    grandTotalMatches += matched.length;
  }

  console.log(`=== รวมทั้งหมด: ${toInsert.length} รายการคะแนนที่จะเพิ่ม (จาก ${grandTotalMatches} การจับคู่) ===`);

  if (!commit) {
    console.log("\n(นี่คือ dry run เท่านั้น ไม่มีการเขียนข้อมูลจริง — รันด้วย --commit เพื่อบันทึกจริง)");
    return;
  }

  // Idempotency guard: skip any (participant, reason) pair that already has
  // a score_entries row with that exact reason, so re-running --commit
  // safely doesn't double-award anyone.
  const { data: existing, error: existingError } = await supabase
    .from("score_entries")
    .select("participant_id, reason")
    .in(
      "reason",
      ACTIVITIES.map((a) => a.label)
    );
  if (existingError) throw existingError;

  const alreadyAwarded = new Set((existing ?? []).map((e) => `${e.participant_id}::${e.reason}`));
  const freshInserts = toInsert.filter(
    (row) => !alreadyAwarded.has(`${row.participant_id}::${row.reason}`)
  );
  const skipped = toInsert.length - freshInserts.length;
  if (skipped > 0) {
    console.log(`ข้าม ${skipped} รายการที่เคยนำเข้าไปแล้ว (กันคะแนนซ้ำ)`);
  }

  if (freshInserts.length === 0) {
    console.log("ไม่มีรายการใหม่ให้บันทึก");
    return;
  }

  const { error: insertError, count } = await supabase
    .from("score_entries")
    .insert(freshInserts, { count: "exact" });
  if (insertError) throw insertError;

  console.log(`บันทึกสำเร็จ: เพิ่ม ${count} รายการคะแนน`);
}

main();
