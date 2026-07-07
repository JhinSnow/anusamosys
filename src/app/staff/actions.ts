"use server";

import { redirect } from "next/navigation";
import { verifyStaffAccessCode } from "@/lib/auth/access-code";
import { createStaffSession, clearStaffSession } from "@/lib/auth/session";

export type LoginState = { error: string } | null;

export async function staffLoginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const code = String(formData.get("code") ?? "");

  if (!code) {
    return { error: "กรุณากรอกรหัสผ่าน" };
  }

  const isValid = await verifyStaffAccessCode(code);
  if (!isValid) {
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }

  await createStaffSession();
  redirect("/staff");
}

export async function staffLogoutAction() {
  await clearStaffSession();
  redirect("/staff");
}
