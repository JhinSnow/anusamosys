// Ambient augmentation for the Worker `env` (Cloudflare bindings/vars/secrets).
// Merges with the `CloudflareEnv` interface `@opennextjs/cloudflare` declares
// globally, and with whatever `npm run cf:typegen` generates from
// wrangler.jsonc bindings. Secrets below are set via `wrangler secret put`
// (production) or `.dev.vars` (local) — never committed, never in
// wrangler.jsonc `vars`.
export {};

declare global {
  interface CloudflareEnv {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    STAFF_ACCESS_CODE_HASH?: string;
    SESSION_SECRET?: string;
  }
}
