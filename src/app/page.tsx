import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-sm tracking-wide text-muted">SMO-0XX</span>
        <h1 className="text-3xl font-semibold text-ink">Anusamosys</h1>
        <p className="max-w-[42ch] text-base text-muted">
          ระบบลงทะเบียนเช็คชื่อและให้คะแนนผู้สมัคร
        </p>
      </div>

      <Link
        href="/leaderboard"
        className="flex w-full max-w-sm flex-col items-center gap-1 rounded-lg border border-border-strong bg-bg p-6 text-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      >
        <span className="text-lg font-semibold text-ink">Leaderboard</span>
        <span className="text-sm text-muted">อันดับคะแนนสูงสุด 5 อันดับ แบบเรียลไทม์</span>
      </Link>

      <Link
        href="/staff"
        className="flex h-14 w-full max-w-sm items-center justify-center rounded-md bg-primary px-7 text-md font-medium text-primary-ink transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-primary-strong"
      >
        เข้าสู่ระบบเจ้าหน้าที่
      </Link>
    </main>
  );
}
