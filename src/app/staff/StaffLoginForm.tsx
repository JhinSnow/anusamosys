"use client";

import { useActionState } from "react";
import { staffLoginAction, type LoginState } from "./actions";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";

const initialState: LoginState = null;

export function StaffLoginForm() {
  const [state, formAction, isPending] = useActionState(staffLoginAction, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-5">
      <TextField
        label="รหัสผ่านเจ้าหน้าที่"
        name="code"
        type="password"
        autoComplete="off"
        required
        autoFocus
      />

      {state?.error && (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
