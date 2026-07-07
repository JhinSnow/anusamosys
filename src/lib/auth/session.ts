import "server-only";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { signPayload, verifyPayload } from "@/lib/auth/crypto";

const COOKIE_NAME = "staff_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // ~6 months — "persists until logout"

type StaffSessionPayload = {
  issuedAt: number;
};

export type StaffSession = {
  issuedAt: number;
};

// Callable anywhere on the server (Server Components, layouts, Server Actions).
export async function getStaffSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const { sessionSecret } = await getServerEnv();
  const payload = await verifyPayload<StaffSessionPayload>(token, sessionSecret);
  if (!payload?.issuedAt) return null;

  return { issuedAt: payload.issuedAt };
}

// Only callable from a Server Action or Route Handler (cookie mutation rule).
export async function createStaffSession(): Promise<void> {
  const { sessionSecret } = await getServerEnv();
  const payload: StaffSessionPayload = { issuedAt: Date.now() };
  const token = await signPayload(payload, sessionSecret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearStaffSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
