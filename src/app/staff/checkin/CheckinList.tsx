"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInParticipant, removeCheckIn } from "./actions";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import type { StaffCheckinRow } from "@/lib/supabase/types";

const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matches(query: string, participant: StaffCheckinRow) {
  if (!query) return true;
  const q = normalize(query);
  const code = normalize(participant.smo_code);
  const nickname = normalize(participant.nickname);
  const digits = participant.smo_code.replace(/\D/g, "");
  return (
    code.includes(q) ||
    nickname.includes(q) ||
    participant.student_id.includes(query.trim()) ||
    digits.includes(q.replace(/\D/g, ""))
  );
}

type SortMode = "code" | "order";

export function CheckinList({ initialParticipants }: { initialParticipants: StaffCheckinRow[] }) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("code");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Check-in order number: rank checked-in participants by their check-in
  // timestamp ascending (1st to arrive = 1). Not-yet-checked-in participants
  // have no order number.
  const orderById = useMemo(() => {
    const checkedIn = participants
      .filter((p) => p.checked_in_at)
      .slice()
      .sort((a, b) => new Date(a.checked_in_at!).getTime() - new Date(b.checked_in_at!).getTime());
    const map = new Map<string, number>();
    checkedIn.forEach((p, index) => map.set(p.id, index + 1));
    return map;
  }, [participants]);

  const sorted = useMemo(() => {
    if (sortMode === "code") return participants;
    const withOrder = participants.filter((p) => orderById.has(p.id));
    const withoutOrder = participants.filter((p) => !orderById.has(p.id));
    withOrder.sort((a, b) => orderById.get(a.id)! - orderById.get(b.id)!);
    return [...withOrder, ...withoutOrder];
  }, [participants, sortMode, orderById]);

  const filtered = useMemo(() => sorted.filter((p) => matches(query, p)), [sorted, query]);

  const checkedInCount = participants.filter((p) => p.checked_in_at).length;

  function applyCheckIn(id: string, checkedInAt: string | null) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, checked_in_at: checkedInAt } : p))
    );
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
    setConfirmingId(null);
    setDeletingId(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goToScore() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    router.push(`/staff/score?ids=${ids.join(",")}`);
  }

  function handleTap(participant: StaffCheckinRow) {
    if (selectMode) {
      toggleSelected(participant.id);
      return;
    }

    setDeletingId(null);

    if (participant.checked_in_at && confirmingId !== participant.id) {
      setConfirmingId(participant.id);
      return;
    }

    const force = participant.checked_in_at != null;
    setConfirmingId(null);
    setPendingId(participant.id);
    startTransition(async () => {
      const result = await checkInParticipant(participant.id, { force });
      setPendingId(null);
      if (result.ok) applyCheckIn(participant.id, result.checkedInAt);
    });
  }

  function handleDelete(participant: StaffCheckinRow) {
    setConfirmingId(null);

    if (deletingId !== participant.id) {
      setDeletingId(participant.id);
      return;
    }

    setDeletingId(null);
    setPendingId(participant.id);
    startTransition(async () => {
      const result = await removeCheckIn(participant.id);
      setPendingId(null);
      if (result.ok) applyCheckIn(participant.id, null);
    });
  }

  return (
    <div className="flex w-full flex-col gap-4 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          autoFocus
          type="search"
          inputMode="search"
          placeholder="ค้นหารหัส SMO-0XX, ชื่อเล่น หรือรหัสนักศึกษา"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-14 w-full rounded-lg border border-border-strong bg-bg px-5 text-lg text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 sm:max-w-sm"
        />
        <Badge tone="primary">
          เช็คอินแล้ว {checkedInCount}/{participants.length}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-fit grid-cols-2 gap-1 rounded-lg bg-surface p-1">
          <button
            type="button"
            onClick={() => setSortMode("code")}
            aria-pressed={sortMode === "code"}
            className={cn(
              "h-10 rounded-md px-4 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
              sortMode === "code" ? "bg-primary text-primary-ink" : "text-muted hover:text-ink"
            )}
          >
            เรียงตามรหัส
          </button>
          <button
            type="button"
            onClick={() => setSortMode("order")}
            aria-pressed={sortMode === "order"}
            className={cn(
              "h-10 rounded-md px-4 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
              sortMode === "order" ? "bg-primary text-primary-ink" : "text-muted hover:text-ink"
            )}
          >
            เรียงตามลำดับเช็คชื่อ
          </button>
        </div>

        <button
          type="button"
          onClick={toggleSelectMode}
          className="h-10 w-fit rounded-md border border-border-strong px-4 text-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface"
        >
          {selectMode ? "ยกเลิกเลือก" : "เลือกเพื่อให้คะแนน"}
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <li className="rounded-lg border border-dashed border-border-strong px-5 py-8 text-center text-muted">
            ไม่พบผู้สมัครที่ตรงกับ &ldquo;{query}&rdquo;
          </li>
        )}
        {filtered.map((participant) => {
          const isConfirming = confirmingId === participant.id;
          const isDeleting = deletingId === participant.id;
          const isRowPending = pendingId === participant.id && isPending;
          const isChecked = selectedIds.has(participant.id);
          const order = orderById.get(participant.id);

          return (
            <li key={participant.id} className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => handleTap(participant)}
                disabled={isRowPending}
                aria-pressed={selectMode ? isChecked : !!participant.checked_in_at}
                className={cn(
                  "flex flex-1 items-center justify-between gap-4 rounded-lg border px-5 py-4 text-left transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] disabled:cursor-wait disabled:opacity-70",
                  selectMode && isChecked
                    ? "border-primary bg-primary-subtle"
                    : "border-border bg-bg hover:bg-surface"
                )}
              >
                <span className="flex items-center gap-3">
                  {selectMode && (
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 text-xs font-bold",
                        isChecked
                          ? "border-primary bg-primary text-primary-ink"
                          : "border-border-strong bg-bg"
                      )}
                    >
                      {isChecked && "✓"}
                    </span>
                  )}
                  <span className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xl font-semibold text-ink">
                        {participant.smo_code}
                      </span>
                      {order && <Badge tone="neutral">ลำดับที่ {order}</Badge>}
                    </span>
                    <span className="text-sm text-muted">
                      {participant.nickname} · {participant.student_id}
                    </span>
                  </span>
                </span>

                {!selectMode &&
                  (participant.checked_in_at ? (
                    <span className="flex items-center gap-3">
                      {isConfirming && (
                        <span className="text-sm text-muted">แตะอีกครั้งเพื่ออัปเดตเวลา</span>
                      )}
                      <Badge tone="success">เช็คอิน {formatTime(participant.checked_in_at)}</Badge>
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-primary">
                      {isRowPending ? "กำลังบันทึก…" : "แตะเพื่อเช็คอิน"}
                    </span>
                  ))}
              </button>

              {!selectMode && participant.checked_in_at && (
                <button
                  type="button"
                  onClick={() => handleDelete(participant)}
                  disabled={isRowPending}
                  aria-label={`ลบการเช็คอินของ ${participant.smo_code}`}
                  className={cn(
                    "shrink-0 rounded-lg border px-4 text-sm font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] disabled:cursor-wait disabled:opacity-70",
                    isDeleting
                      ? "border-error bg-error text-error-ink"
                      : "border-border-strong text-muted hover:border-error hover:text-error"
                  )}
                >
                  {isRowPending ? "…" : isDeleting ? "ยืนยันลบ?" : "ลบ"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-border-strong bg-bg px-6 py-4 shadow-[var(--shadow-lg)]">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <span className="text-sm font-medium text-ink">เลือกแล้ว {selectedIds.size} คน</span>
            <Button onClick={goToScore}>ให้คะแนน {selectedIds.size} คน</Button>
          </div>
        </div>
      )}
    </div>
  );
}
