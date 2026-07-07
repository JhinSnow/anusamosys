// One-off helper: hash the staff access code and mint a session secret for
// .dev.vars (local) or `wrangler secret put` (deployed). Never prints or
// stores the plaintext code anywhere.
//
// Usage: npx tsx scripts/generate-secrets.ts "your-access-code"
import { hashSecret } from "../src/lib/auth/crypto";

function randomSecret(bytes = 32): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Buffer.from(arr).toString("base64url");
}

async function main() {
  const code = process.argv[2];
  if (!code) {
    console.error('Usage: npx tsx scripts/generate-secrets.ts "your-access-code"');
    process.exit(1);
  }

  const staffAccessCodeHash = await hashSecret(code);
  const sessionSecret = randomSecret();

  console.log("STAFF_ACCESS_CODE_HASH=" + staffAccessCodeHash);
  console.log("SESSION_SECRET=" + sessionSecret);
}

main();
