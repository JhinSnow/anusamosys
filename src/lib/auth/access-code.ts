import "server-only";
import { verifySecret } from "@/lib/auth/crypto";
import { getServerEnv } from "@/lib/env";

export async function verifyStaffAccessCode(code: string): Promise<boolean> {
  const { staffAccessCodeHash } = await getServerEnv();
  return verifySecret(code, staffAccessCodeHash);
}
