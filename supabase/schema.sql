-- Anusamosys schema: applicant check-in + scoring
--
-- Run this once against your Supabase project (SQL Editor, or `supabase db push`
-- if you adopt the CLI later). Idempotent-ish: safe to re-run after a `drop` of
-- everything below, not safe to double-`create` without dropping first.

create extension if not exists "pgcrypto";

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  smo_code text not null unique,
  student_id text not null unique,
  nickname text not null,
  group_label text not null check (group_label in ('A', 'B')),
  sequence int not null unique,
  interview_time time not null,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists participants_smo_code_idx on participants (smo_code);

create table if not exists score_entries (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  amount int not null check (amount <> 0), -- positive = add, negative = deduct
  reason text,
  staff_name text, -- nullable: staff login is code-only, no per-staff identity captured
  created_at timestamptz not null default now()
);

create index if not exists score_entries_participant_id_idx on score_entries (participant_id);

-- ============================================================================
-- Public-safe views
--
-- Deliberately NOT `security_invoker` — these views run with the view owner's
-- privileges so they can read the locked-down base tables and return only the
-- columns we choose (never student_id). This is a standard Postgres/Supabase
-- pattern for column-level masking. Do not "fix" this to security_invoker; it
-- would make the views return nothing for anon, since anon has no RLS grant
-- on the base tables by design.
-- ============================================================================

create or replace view participants_public as
  select id, smo_code, nickname, group_label, interview_time, checked_in_at
  from participants;

create or replace view participant_totals as
  select
    p.id as participant_id,
    p.smo_code,
    p.nickname,
    coalesce(sum(s.amount), 0)::int as total_score
  from participants p
  left join score_entries s on s.participant_id = p.id
  group by p.id, p.smo_code, p.nickname;

-- ============================================================================
-- Row Level Security
--
-- Base tables: no anon/authenticated policies on `participants` at all — it's
-- reachable only via the service role (server-side, bypasses RLS) or via the
-- `participants_public` view above. `score_entries` gets a public SELECT
-- policy because the leaderboard's Realtime subscription needs to read it
-- directly (Realtime always evaluates against the base table, not a view).
-- Writes to both tables happen only through server code using the service
-- role key, gated by the staff access-code session — never from the browser.
-- ============================================================================

alter table participants enable row level security;
alter table score_entries enable row level security;

drop policy if exists "score_entries_public_read" on score_entries;
create policy "score_entries_public_read"
  on score_entries
  for select
  to anon, authenticated
  using (true);

grant select on participants_public to anon, authenticated;
grant select on participant_totals to anon, authenticated;
grant select on score_entries to anon, authenticated;

-- ============================================================================
-- Realtime
--
-- The leaderboard listens for INSERTs on score_entries and refetches
-- participant_totals when one arrives.
-- ============================================================================

alter publication supabase_realtime add table score_entries;
