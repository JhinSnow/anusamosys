import { getCloudflareContext } from "@opennextjs/cloudflare";

// Server-only secrets live in the Worker's `env` (Cloudflare bindings/vars),
// not `process.env` — Workers don't populate process.env from secrets the
// way Node does. `getCloudflareContext()` is simulated locally under
// `next dev` too (see next.config.ts), reading from `.dev.vars`, so this
// works the same in dev, `wrangler dev`, and the deployed Worker.
export async function getServerEnv() {
  const { env } = await getCloudflareContext({ async: true });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const staffAccessCodeHash = env.STAFF_ACCESS_CODE_HASH ?? process.env.STAFF_ACCESS_CODE_HASH;
  const sessionSecret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;

  if (!supabaseUrl || !supabaseServiceRoleKey || !staffAccessCodeHash || !sessionSecret) {
    throw new Error(
      "Missing server environment variables. Check .dev.vars (local) or your Worker secrets (deployed): " +
        "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STAFF_ACCESS_CODE_HASH, SESSION_SECRET."
    );
  }

  return { supabaseUrl, supabaseServiceRoleKey, staffAccessCodeHash, sessionSecret };
}
