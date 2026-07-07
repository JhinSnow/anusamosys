-- Staff login is now code-only (no per-staff name captured), so score_entries
-- can no longer guarantee a staff_name on insert. Run this once against your
-- existing Supabase project (SQL Editor) — schema.sql alone won't retroactively
-- alter a table that already exists.

alter table score_entries alter column staff_name drop not null;
