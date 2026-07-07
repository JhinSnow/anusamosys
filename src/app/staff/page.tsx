import Link from "next/link";
import { getStaffSession } from "@/lib/auth/session";
import { StaffLoginForm } from "./StaffLoginForm";
import { StaffHeader } from "@/components/StaffHeader";
import { BackLink } from "@/components/BackLink";

export default async function StaffGatePage() {
  const session = await getStaffSession();

  if (session) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        <StaffHeader title="เมนูเจ้าหน้าที่" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/staff/checkin"
            className="flex flex-col gap-1 rounded-lg border border-border-strong bg-bg p-6 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            <span className="text-lg font-semibold text-ink">เช็คชื่อ</span>
            <span className="text-sm text-muted">บันทึกเวลาลงทะเบียนของผู้สมัคร</span>
          </Link>

          <Link
            href="/staff/score"
            className="flex flex-col gap-1 rounded-lg border border-border-strong bg-bg p-6 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            <span className="text-lg font-semibold text-ink">ให้คะแนน</span>
            <span className="text-sm text-muted">ให้คะแนนผู้สมัครแบบสะสม</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-full flex-1 flex-col gap-8 px-6 py-10">
      <BackLink href="/" label="กลับหน้าแรก" />
      <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold text-ink">เข้าสู่ระบบเจ้าหน้าที่</h1>
          <p className="max-w-[36ch] text-sm text-muted">
            กรอกรหัสผ่านของคุณ ระบบจะจำไว้บนเครื่องนี้จนกว่าจะออกจากระบบ
          </p>
        </div>
        <StaffLoginForm />
      </div>
    </main>
  );
}
