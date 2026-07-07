// Web Crypto only (globalThis.crypto.subtle) — identical behavior on the
// Node `next dev` server and the deployed Cloudflare Worker. No native
// bindings (bcrypt) that would need `nodejs_compat` shims or fail on Workers.

// Cloudflare Workers' WebCrypto PBKDF2 implementation hard-caps iterations at
// 100,000 (throws NotSupportedError above that) — this is the ceiling, not a
// security-tuned choice like a typical Node.js PBKDF2 count.
const PBKDF2_ITERATIONS = 100_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---------------------------------------------------------------------------
// PBKDF2 password hashing (for the shared staff access code)
// ---------------------------------------------------------------------------

export async function hashSecret(secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(secret, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  const salt = fromBase64Url(parts[2]);
  const expected = fromBase64Url(parts[3]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const actual = await deriveBits(secret, salt, iterations);
  return timingSafeEqual(actual, expected);
}

async function deriveBits(
  secret: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

// ---------------------------------------------------------------------------
// HMAC-signed session tokens (for the staff cookie)
// ---------------------------------------------------------------------------

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signPayload(payload: unknown, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const encoded = toBase64Url(new TextEncoder().encode(json));
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  return `${encoded}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyPayload<T>(token: string, secret: string): Promise<T | null> {
  const [encoded, signaturePart] = token.split(".");
  if (!encoded || !signaturePart) return null;

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signaturePart) as BufferSource,
    new TextEncoder().encode(encoded)
  );
  if (!valid) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(encoded));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
