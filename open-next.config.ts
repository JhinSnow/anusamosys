import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// This app has no ISR/static-generation routes that need a durable
// incremental cache (check-in, scoring, and the leaderboard are always
// rendered dynamically against Supabase), so the default in-worker cache
// is enough — no R2/KV binding required.
export default defineCloudflareConfig();
