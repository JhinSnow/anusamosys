"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  getScoreHistory,
  submitBulkScore,
  submitScore,
  type ScoreHistoryEntry,
} from "./actions";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { TextField } from "@/components/TextField";
import { cn } from "@/lib/cn";
import type { ParticipantTotal } from "@/lib/supabase/types";

const QUICK_AMOUNTS = [10, 20, 30];
const STAFF_NAME_STORAGE_KEY = "anusamosys_staff_name";

const historyTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matches(query: string, participant: ParticipantTotal) {
  if (!query) return true;
  const q = normalize(query);
  const code = normalize(participant.smo_code);
  const nickname = normalize(participant.nickname);
  const digits = participant.smo_code.replace(/\D/g, "");
  return code.includes(q) || nickname.includes(q) || digits.includes(q.replace(/\D/g, ""));
}

export function ScorePanel({
  initialParticipants,
  initialSelectedIds,
}: {
  initialParticipants: ParticipantTotal[];
  initialSelectedIds?: string[];
}) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedIds?.length === 1 ? initialSelectedIds[0] : null
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bulkMode, setBulkMode] = useState((initialSelectedIds?.length ?? 0) > 1);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(
    new Set((initialSelectedIds?.length ?? 0) > 1 ? initialSelectedIds : [])
  );
  const [bulkConfirming, setBulkConfirming] = useState((initialSelectedIds?.length ?? 0) > 1);

  const filtered = useMemo(
    () => participants.filter((p) => matches(query, p)),
    [participants, query]
  );

  const selected = participants.find((p) => p.participant_id === selectedId) ?? null;

  const bulkSelectedParticipants = useMemo(
    () => participants.filter((p) => bulkSelectedIds.has(p.participant_id)),
    [participants, bulkSelectedIds]
  );

  function updateTotal(participantId: string, newTotal: number) {
    setParticipants((prev) =>
      prev.map((p) => (p.participant_id === participantId ? { ...p, total_score: newTotal } : p))
    );
  }

  function updateTotals(updated: Record<string, number>) {
    setParticipants((prev) =>
      prev.map((p) =>
        updated[p.participant_id] !== undefined
          ? { ...p, total_score: updated[p.participant_id] }
          : p
      )
    );
  }

  function selectParticipant(id: string) {
    setSelectedId(id);
    setQuery("");
    setDropdownOpen(false);
  }

  function toggleBulkSelect(id: string) {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleBulkMode() {
    setBulkMode((v) => !v);
    setBulkSelectedIds(new Set());
    setBulkConfirming(false);
    setSelectedId(null);
    setQuery("");
  }

  function handleBlur() {
    // Delay so a click on a dropdown item registers before we close it.
    blurTimeoutRef.current = setTimeout(() => setDropdownOpen(false), 150);
  }

  function handleFocus() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setDropdownOpen(true);
  }

  if (bulkMode && bulkConfirming) {
    return (
      <BulkScoreForm
        participants={bulkSelectedParticipants}
        onBack={() => {
          setBulkConfirming(false);
          setBulkSelectedIds(new Set());
        }}
        onScored={updateTotals}
      />
    );
  }

  if (bulkMode) {
    const allFilteredSelected = filtered.length > 0 && filtered.every((p) => bulkSelectedIds.has(p.participant_id));

    return (
      <div className="flex flex-col gap-4 pb-24">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleBulkMode}
            className="h-10 rounded-md border border-border-strong px-4 text-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface"
          >
            เลือกทีละคน
          </button>
          <button
            type="button"
            onClick={() =>
              setBulkSelectedIds((prev) => {
                if (allFilteredSelected) {
                  const next = new Set(prev);
                  filtered.forEach((p) => next.delete(p.participant_id));
                  return next;
                }
                const next = new Set(prev);
                filtered.forEach((p) => next.add(p.participant_id));
                return next;
              })
            }
            className="text-sm font-medium text-primary transition-colors duration-[var(--duration-fast)] hover:text-primary-strong"
          >
            {allFilteredSelected ? "ยกเลิกที่ค้นพบทั้งหมด" : "เลือกที่ค้นพบทั้งหมด"}
          </button>
        </div>

        <input
          type="search"
          inputMode="search"
          placeholder="ค้นหารหัส SMO-0XX เพื่อเลือกหลายคน"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-14 w-full rounded-lg border border-border-strong bg-bg px-5 text-lg text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
        />

        <ul className="flex flex-col gap-2">
          {filtered.length === 0 && (
            <li className="rounded-lg border border-dashed border-border-strong px-5 py-8 text-center text-muted">
              ไม่พบผู้สมัครที่ตรงกับ &ldquo;{query}&rdquo;
            </li>
          )}
          {filtered.map((participant) => {
            const isChecked = bulkSelectedIds.has(participant.participant_id);
            return (
              <li key={participant.participant_id}>
                <button
                  type="button"
                  onClick={() => toggleBulkSelect(participant.participant_id)}
                  aria-pressed={isChecked}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-lg border px-5 py-4 text-left transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
                    isChecked
                      ? "border-primary bg-primary-subtle"
                      : "border-border bg-bg hover:bg-surface"
                  )}
                >
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
                  <span className="flex-1 font-mono text-xl font-semibold text-ink">
                    {participant.smo_code}
                  </span>
                  <Badge tone="primary">{participant.total_score} คะแนน</Badge>
                </button>
              </li>
            );
          })}
        </ul>

        {bulkSelectedIds.size > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-border-strong bg-bg px-6 py-4 shadow-[var(--shadow-lg)]">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
              <span className="text-sm font-medium text-ink">
                เลือกแล้ว {bulkSelectedIds.size} คน
              </span>
              <Button onClick={() => setBulkConfirming(true)}>
                ให้คะแนน {bulkSelectedIds.size} คน
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!selected && (
        <button
          type="button"
          onClick={toggleBulkMode}
          className="h-10 w-fit self-end rounded-md border border-border-strong px-4 text-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface"
        >
          เลือกหลายคนพร้อมกัน
        </button>
      )}

      <div className="relative">
        <input
          autoFocus={!selected}
          type="search"
          inputMode="search"
          placeholder={selected ? "พิมพ์เพื่อสลับไปคนถัดไป" : "ค้นหารหัส SMO-0XX"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="h-14 w-full rounded-lg border border-border-strong bg-bg px-5 text-lg text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
        />

        {selected && dropdownOpen && (
          <ul
            className="absolute z-[var(--z-dropdown)] mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-border-strong bg-bg shadow-[var(--shadow-md)]"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <li className="px-5 py-4 text-center text-muted">
                ไม่พบผู้สมัครที่ตรงกับ &ldquo;{query}&rdquo;
              </li>
            ) : (
              filtered.map((participant) => (
                <li key={participant.participant_id}>
                  <button
                    type="button"
                    onClick={() => selectParticipant(participant.participant_id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors duration-[var(--duration-fast)] hover:bg-surface"
                  >
                    <span className="font-mono text-lg font-semibold text-ink">
                      {participant.smo_code}
                    </span>
                    <Badge tone="primary">{participant.total_score} คะแนน</Badge>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {selected ? (
        <ScoreForm
          key={selected.participant_id}
          participant={selected}
          onScored={(newTotal) => updateTotal(selected.participant_id, newTotal)}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.length === 0 && (
            <li className="rounded-lg border border-dashed border-border-strong px-5 py-8 text-center text-muted">
              ไม่พบผู้สมัครที่ตรงกับ &ldquo;{query}&rdquo;
            </li>
          )}
          {filtered.map((participant) => (
            <li key={participant.participant_id}>
              <button
                type="button"
                onClick={() => selectParticipant(participant.participant_id)}
                className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-bg px-5 py-4 text-left transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-surface"
              >
                <span className="font-mono text-xl font-semibold text-ink">
                  {participant.smo_code}
                </span>
                <Badge tone="primary">{participant.total_score} คะแนน</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Mode = "add" | "deduct";

function useAmountPicker(onChange?: () => void) {
  const [mode, setMode] = useState<Mode>("add");
  const [magnitude, setMagnitude] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState("");

  const amount = magnitude === null ? null : mode === "deduct" ? -magnitude : magnitude;

  function switchMode(next: Mode) {
    setMode(next);
    onChange?.();
  }

  function pickQuick(value: number) {
    setMagnitude(value);
    setCustomValue("");
    onChange?.();
  }

  function handleCustomChange(value: string) {
    setCustomValue(value);
    const parsed = Math.abs(Number(value));
    setMagnitude(value.trim() === "" || Number.isNaN(parsed) ? null : parsed);
    onChange?.();
  }

  function reset() {
    setMode("add");
    setMagnitude(null);
    setCustomValue("");
  }

  return { mode, magnitude, customValue, amount, switchMode, pickQuick, handleCustomChange, reset };
}

function AmountPicker({
  mode,
  magnitude,
  customValue,
  onSwitchMode,
  onPickQuick,
  onCustomChange,
}: {
  mode: Mode;
  magnitude: number | null;
  customValue: string;
  onSwitchMode: (mode: Mode) => void;
  onPickQuick: (value: number) => void;
  onCustomChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface p-1">
        <button
          type="button"
          onClick={() => onSwitchMode("add")}
          aria-pressed={mode === "add"}
          className={cn(
            "h-11 rounded-md text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
            mode === "add" ? "bg-primary text-primary-ink" : "text-muted hover:text-ink"
          )}
        >
          เพิ่มคะแนน
        </button>
        <button
          type="button"
          onClick={() => onSwitchMode("deduct")}
          aria-pressed={mode === "deduct"}
          className={cn(
            "h-11 rounded-md text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
            mode === "deduct" ? "bg-error text-error-ink" : "text-muted hover:text-ink"
          )}
        >
          หักคะแนน
        </button>
      </div>

      <span className="text-sm font-medium text-ink">จำนวนคะแนน</span>
      <div className="flex flex-wrap gap-3">
        {QUICK_AMOUNTS.map((value) => {
          const isActive = magnitude === value && customValue === "";
          return (
            <button
              key={value}
              type="button"
              onClick={() => onPickQuick(value)}
              aria-pressed={isActive}
              className={cn(
                "h-14 min-w-20 rounded-lg border px-5 text-xl font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
                isActive
                  ? mode === "add"
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-error bg-error-subtle text-error"
                  : "border-border-strong bg-bg text-ink hover:bg-surface"
              )}
            >
              {mode === "add" ? "+" : "-"}
              {value}
            </button>
          );
        })}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="กรอกเอง"
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          className="h-14 w-32 rounded-lg border border-border-strong bg-bg px-4 text-xl font-semibold text-ink placeholder:text-base placeholder:font-normal placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
        />
      </div>
    </div>
  );
}

function ScoreForm({
  participant,
  onScored,
}: {
  participant: ParticipantTotal;
  onScored: (newTotal: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ amount: number; newTotal: number } | null>(null);
  const picker = useAmountPicker(() => setReceipt(null));
  // Lazy initializer, not an effect: this component only ever mounts
  // client-side (after selecting a participant), never during SSR, so
  // reading localStorage here can't cause a hydration mismatch.
  const [staffName, setStaffName] = useState(
    () => window.localStorage.getItem(STAFF_NAME_STORAGE_KEY) ?? ""
  );
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [history, setHistory] = useState<ScoreHistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  function refreshHistory() {
    getScoreHistory(participant.participant_id).then((result) => {
      if (result.ok) {
        setHistory(result.entries);
        setHistoryError(null);
      } else {
        setHistoryError(result.error);
      }
    });
  }

  // `key={participant.participant_id}` on this component (see ScorePanel)
  // already forces a full remount per participant, so this only ever needs
  // to run once on mount — refreshHistory is intentionally omitted since it
  // closes over the same stable participant.participant_id for this
  // component's entire lifetime.
  useEffect(() => {
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit() {
    if (picker.amount === null || picker.amount === 0) {
      setError("เลือกหรือกรอกจำนวนคะแนนก่อน");
      return;
    }
    if (!staffName.trim()) {
      setError("กรอกชื่อผู้ให้คะแนนก่อน");
      return;
    }
    setError(null);

    const trimmedName = staffName.trim();
    const amount = picker.amount;
    startTransition(async () => {
      const result = await submitScore(participant.participant_id, amount, reason, trimmedName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.localStorage.setItem(STAFF_NAME_STORAGE_KEY, trimmedName);
      onScored(result.newTotal);
      setReceipt({ amount, newTotal: result.newTotal });
      picker.reset();
      setReason("");
      refreshHistory();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-6 py-5">
        <span className="font-mono text-2xl font-semibold text-ink">{participant.smo_code}</span>
        <span className="mt-2 text-sm text-muted">
          ยอดคะแนนปัจจุบัน{" "}
          <span className="font-mono text-base font-semibold text-ink">
            {participant.total_score}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">ประวัติการให้คะแนน</span>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
          {history === null ? (
            <p className="px-4 py-6 text-center text-sm text-muted">กำลังโหลด…</p>
          ) : historyError ? (
            <p className="px-4 py-6 text-center text-sm text-error">
              โหลดประวัติไม่สำเร็จ: {historyError}
            </p>
          ) : history.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">ยังไม่มีประวัติการให้คะแนน</p>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 border-b border-border px-4 py-2.5 last:border-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-ink">
                    {entry.staff_name ?? "ไม่ระบุ"}
                  </span>
                  {entry.reason && <span className="text-sm text-muted">{entry.reason}</span>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold",
                      entry.amount > 0 ? "text-success" : "text-error"
                    )}
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount}
                  </span>
                  <span className="text-xs text-muted">
                    {historyTimeFormatter.format(new Date(entry.created_at))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TextField
        label="ชื่อผู้ให้คะแนน"
        name="staffName"
        value={staffName}
        onChange={(e) => setStaffName(e.target.value)}
        hint="ระบบจำชื่อล่าสุดไว้บนเครื่องนี้ให้อัตโนมัติ"
        required
      />

      {receipt && (
        <div
          className={cn(
            "flex flex-col gap-1 rounded-lg border px-6 py-5",
            receipt.amount > 0 ? "border-success bg-success-subtle" : "border-error bg-error-subtle"
          )}
        >
          <span className={cn("text-sm font-medium", receipt.amount > 0 ? "text-success" : "text-error")}>
            {receipt.amount > 0 ? "ให้คะแนนสำเร็จ" : "หักคะแนนสำเร็จ"}
          </span>
          <span className="text-lg text-ink">
            {receipt.amount > 0 ? "+" : ""}
            {receipt.amount} คะแนน · ยอดรวมใหม่ {receipt.newTotal}
          </span>
        </div>
      )}

      <AmountPicker
        mode={picker.mode}
        magnitude={picker.magnitude}
        customValue={picker.customValue}
        onSwitchMode={picker.switchMode}
        onPickQuick={picker.pickQuick}
        onCustomChange={picker.handleCustomChange}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">เหตุผล (ไม่บังคับ)</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder={picker.mode === "add" ? "เช่น ตอบคำถามได้ดีมาก" : "เช่น มาสาย"}
          className="resize-none rounded-lg border border-border-strong bg-bg px-4 py-3 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
        />
      </label>

      {error && <p className="text-sm text-error">{error}</p>}

      <Button
        size="lg"
        variant={picker.mode === "deduct" ? "danger" : "primary"}
        onClick={handleSubmit}
        disabled={isPending}
      >
        {isPending ? "กำลังบันทึก…" : picker.mode === "add" ? "ให้คะแนน" : "หักคะแนน"}
      </Button>
    </div>
  );
}

function BulkScoreForm({
  participants,
  onBack,
  onScored,
}: {
  participants: ParticipantTotal[];
  onBack: () => void;
  onScored: (updatedTotals: Record<string, number>) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ amount: number; count: number } | null>(null);
  const picker = useAmountPicker(() => setReceipt(null));
  const [staffName, setStaffName] = useState(
    () => window.localStorage.getItem(STAFF_NAME_STORAGE_KEY) ?? ""
  );
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (participants.length === 0) {
      setError("เลือกผู้สมัครอย่างน้อย 1 คน");
      return;
    }
    if (picker.amount === null || picker.amount === 0) {
      setError("เลือกหรือกรอกจำนวนคะแนนก่อน");
      return;
    }
    if (!staffName.trim()) {
      setError("กรอกชื่อผู้ให้คะแนนก่อน");
      return;
    }
    setError(null);

    const trimmedName = staffName.trim();
    const amount = picker.amount;
    const ids = participants.map((p) => p.participant_id);
    startTransition(async () => {
      const result = await submitBulkScore(ids, amount, reason, trimmedName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.localStorage.setItem(STAFF_NAME_STORAGE_KEY, trimmedName);
      setReceipt({ amount, count: ids.length });
      picker.reset();
      setReason("");
      onScored(result.updatedTotals);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="w-fit text-sm font-medium text-muted transition-colors duration-[var(--duration-fast)] hover:text-ink"
      >
        ← กลับไปเลือกใหม่
      </button>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-6 py-5">
        <span className="text-sm text-muted">เลือกแล้ว {participants.length} คน</span>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <span
              key={p.participant_id}
              className="rounded-full border border-border-strong bg-bg px-3 py-1 font-mono text-sm text-ink"
            >
              {p.smo_code}
            </span>
          ))}
        </div>
      </div>

      <TextField
        label="ชื่อผู้ให้คะแนน"
        name="bulkStaffName"
        value={staffName}
        onChange={(e) => setStaffName(e.target.value)}
        hint="ระบบจำชื่อล่าสุดไว้บนเครื่องนี้ให้อัตโนมัติ"
        required
      />

      {receipt && (
        <div
          className={cn(
            "flex flex-col gap-1 rounded-lg border px-6 py-5",
            receipt.amount > 0 ? "border-success bg-success-subtle" : "border-error bg-error-subtle"
          )}
        >
          <span className={cn("text-sm font-medium", receipt.amount > 0 ? "text-success" : "text-error")}>
            {receipt.amount > 0 ? "ให้คะแนนสำเร็จ" : "หักคะแนนสำเร็จ"}
          </span>
          <span className="text-lg text-ink">
            {receipt.amount > 0 ? "+" : ""}
            {receipt.amount} คะแนน · {receipt.count} คน
          </span>
        </div>
      )}

      <AmountPicker
        mode={picker.mode}
        magnitude={picker.magnitude}
        customValue={picker.customValue}
        onSwitchMode={picker.switchMode}
        onPickQuick={picker.pickQuick}
        onCustomChange={picker.handleCustomChange}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">เหตุผล (ไม่บังคับ)</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder={picker.mode === "add" ? "เช่น ตอบคำถามทีมนี้ได้ดีมาก" : "เช่น ทีมนี้มาสาย"}
          className="resize-none rounded-lg border border-border-strong bg-bg px-4 py-3 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
        />
      </label>

      {error && <p className="text-sm text-error">{error}</p>}

      <Button
        size="lg"
        variant={picker.mode === "deduct" ? "danger" : "primary"}
        onClick={handleSubmit}
        disabled={isPending || participants.length === 0}
      >
        {isPending
          ? "กำลังบันทึก…"
          : picker.mode === "add"
            ? `ให้คะแนน ${participants.length} คน`
            : `หักคะแนน ${participants.length} คน`}
      </Button>
    </div>
  );
}
