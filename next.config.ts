import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

// Lets `getCloudflareContext()` work under `next dev` too (not just
// `wrangler dev`), by simulating bindings/vars from `.dev.vars` locally.
initOpenNextCloudflareForDev();

export default nextConfig;
