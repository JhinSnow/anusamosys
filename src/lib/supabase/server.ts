import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

// Privileged client: service-role key, full table access, bypasses RLS.
// Server Components / Server Actions only — never send this client or its
// key to the browser. This is the only place writes to `participants` /
// `score_entries` happen.
export async function getSupabaseServerClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = await getServerEnv();

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
