// One-time (or re-run-safe) import of the roster into Supabase.
// Usage: npm run seed
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SEED_ROWS } from "./seed-data";
import { toSmoCode } from "../src/lib/smo-code";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

async function seed() {
  const rows = SEED_ROWS.map((row) => ({
    smo_code: toSmoCode(row.sequence),
    student_id: row.studentId,
    nickname: row.nickname,
    group_label: row.groupLabel,
    sequence: row.sequence,
    interview_time: row.interviewTime,
  }));

  const { data, error } = await supabase
    .from("participants")
    .upsert(rows, { onConflict: "sequence" })
    .select("smo_code");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${data?.length ?? 0} participants (SMO-001..SMO-${String(SEED_ROWS.length).padStart(3, "0")}).`);
}

seed();
