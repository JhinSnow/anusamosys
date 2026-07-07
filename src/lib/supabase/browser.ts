"use client";

import { createClient } from "@supabase/supabase-js";

// Public client: publishable/anon key only. RLS restricts this to
// `participants_public`, `participant_totals`, and read-only `score_entries`
// (see supabase/schema.sql) — used for the leaderboard's Realtime feed.
let client: ReturnType<typeof createClient> | undefined;

export function getSupabaseBrowserClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      );
    }

    client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  return client;
}
