"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, MotionConfig } from "motion/react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ParticipantTotal } from "@/lib/supabase/types";

const POLL_INTERVAL_MS = 10_000;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const BOUNCE_SPRING = { type: "spring", stiffness: 240, damping: 16, mass: 0.9 } as const;
const BUMP_DURATION_MS = 1100;
const FLASH_SHADOW_OFF = "var(--lb-card-shadow)";

// Auto-scroll ticker timing: a full pass down takes about a minute; the
// return trip up is deliberately slower, with a short dwell at each end
// before reversing so the direction change doesn't feel abrupt.
const SCROLL_DOWN_DURATION_MS = 60_000;
const SCROLL_UP_DURATION_MS = 100_000;
const SCROLL_DWELL_MS = 2500;
const INTERACTION_PAUSE_MS = 8000;

async function fetchRanking(): Promise<ParticipantTotal[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("participant_totals")
    .select("participant_id, smo_code, nickname, total_score")
    .order("total_score", { ascending: false })
    .order("smo_code", { ascending: true })
    .returns<ParticipantTotal[]>();

  if (error) {
    console.error("Failed to refresh leaderboard:", error.message);
    return [];
  }
  return data ?? [];
}

export function Leaderboard({ initialRanking }: { initialRanking: ParticipantTotal[] }) {
  const [ranking, setRanking] = useState(initialRanking);
  const [isLive, setIsLive] = useState(false);
  // participant_id -> most recent score delta (+/-), shown as a bump + a
  // floating "+20" / "-10" badge. Cleared after the animation plays once.
  const [deltas, setDeltas] = useState<Map<string, number>>(new Map());
  const scoreRef = useRef(new Map(initialRanking.map((p) => [p.participant_id, p.total_score])));
  const bumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applyRanking(next: ParticipantTotal[]) {
    const changedDeltas = new Map<string, number>();
    next.forEach((p) => {
      const prevScore = scoreRef.current.get(p.participant_id);
      if (prevScore !== undefined && prevScore !== p.total_score) {
        changedDeltas.set(p.participant_id, p.total_score - prevScore);
      }
    });
    scoreRef.current = new Map(next.map((p) => [p.participant_id, p.total_score]));

    setRanking(next);
    if (changedDeltas.size > 0) {
      setDeltas(changedDeltas);
      if (bumpTimeoutRef.current) clearTimeout(bumpTimeoutRef.current);
      bumpTimeoutRef.current = setTimeout(() => setDeltas(new Map()), BUMP_DURATION_MS);
    }
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("leaderboard-score-entries")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "score_entries" },
        () => {
          fetchRanking().then(applyRanking);
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    // Realtime covers instant updates; this is a resilience net so the board
    // never drifts more than ~10s stale even if the socket hiccups.
    const interval = setInterval(() => {
      fetchRanking().then(applyRanking);
    }, POLL_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (bumpTimeoutRef.current) clearTimeout(bumpTimeoutRef.current);
    };
  }, []);

  const { autoScrollOn, toggleAutoScroll } = useAutoScrollTicker();

  return (
    // Passive/projected display, not a task someone operates — the
    // reorder is the whole point of the page (PRODUCT.md calls it out as
    // the one deliberate "moment of delight"), so motion always plays
    // rather than respecting the viewer's OS reduced-motion setting.
    // The continuous auto-scroll ticker is the exception: it runs for
    // minutes at a time, so it does respect reduced-motion (see
    // useAutoScrollTicker) and always ships an explicit pause control.
    <MotionConfig reducedMotion="never">
      <div className="flex w-full max-w-2xl flex-col">
        <div
          className="sticky top-0 z-[var(--z-sticky)] -mx-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4 sm:mx-0 sm:rounded-xl sm:px-6"
          style={{ background: "var(--lb-bg)" }}
        >
          <h1 className="text-3xl font-semibold text-[var(--lb-ink)]">อันดับคะแนน</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--lb-muted)]">{ranking.length} คน</span>
            <LiveIndicator isLive={isLive} />
            <button
              type="button"
              onClick={toggleAutoScroll}
              aria-pressed={autoScrollOn}
              className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--duration-fast)]"
              style={{
                borderColor: "var(--lb-border)",
                color: "var(--lb-muted)",
                background: "var(--lb-surface)",
              }}
            >
              {autoScrollOn ? "⏸ หยุดเลื่อนอัตโนมัติ" : "▶ เลื่อนอัตโนมัติ"}
            </button>
          </div>
        </div>

        {ranking.length === 0 ? (
          <p
            className="mt-6 rounded-lg border border-dashed px-6 py-10 text-center text-[var(--lb-muted)]"
            style={{ borderColor: "var(--lb-border)" }}
          >
            ยังไม่มีคะแนน
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3 pb-16">
            <AnimatePresence initial={false}>
              {ranking.map((participant, index) => (
                <motion.li
                  key={participant.participant_id}
                  layout
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -28 }}
                  transition={{ layout: BOUNCE_SPRING, duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <RankRow
                    rank={index + 1}
                    participant={participant}
                    delta={deltas.get(participant.participant_id) ?? null}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </MotionConfig>
  );
}

// Continuously auto-scrolls the page down, dwells at the bottom, scrolls
// back up (slower), dwells at the top, and repeats — a ticker for an
// unattended projected display. Pauses whenever a person actually touches
// the page (scroll/touch/pointer), resuming after a short idle window, and
// exposes an explicit on/off toggle (WCAG 2.2.2 requires a way to stop any
// auto-moving content that runs longer than 5s). Starts off by default for
// viewers who prefer reduced motion.
function useAutoScrollTicker() {
  const [autoScrollOn, setAutoScrollOn] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const directionRef = useRef<"down" | "up">("down");
  const dwellUntilRef = useRef(0);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgrammaticYRef = useRef(0);

  // `window.matchMedia` isn't available during SSR, and this component IS
  // server-rendered (unlike the score form), so the initial state has to be
  // a fixed value consistent with the server-rendered HTML (the toggle
  // button's label depends on it) — checking the real preference has to
  // happen after mount, in an effect, to avoid a hydration mismatch.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoScrollOn(false);
    }
  }, []);

  useEffect(() => {
    // Listening on "scroll" (rather than just wheel/touch) catches every way
    // a person can move the page — wheel, touch, keyboard, or dragging the
    // scrollbar thumb. Our own programmatic scrollTo() calls also fire
    // "scroll", so we compare against the Y we last set ourselves: a match
    // (within rounding) is our own move, anything else is a genuine user
    // interaction. A time-based suppression window doesn't work here since
    // it ticks every animation frame and would end up always "recently set".
    function handleScroll() {
      if (Math.abs(window.scrollY - lastProgrammaticYRef.current) < 2) return;
      setUserPaused(true);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => setUserPaused(false), INTERACTION_PAUSE_MS);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!autoScrollOn || userPaused) return;

    let raf: number;
    let lastTime = performance.now();

    function tick(now: number) {
      const dt = now - lastTime;
      lastTime = now;

      if (now < dwellUntilRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const duration =
        directionRef.current === "down" ? SCROLL_DOWN_DURATION_MS : SCROLL_UP_DURATION_MS;
      const pxPerMs = maxScroll / duration;
      const delta = pxPerMs * dt * (directionRef.current === "down" ? 1 : -1);
      let next = window.scrollY + delta;

      if (next >= maxScroll) {
        next = maxScroll;
        directionRef.current = "up";
        dwellUntilRef.current = now + SCROLL_DWELL_MS;
      } else if (next <= 0) {
        next = 0;
        directionRef.current = "down";
        dwellUntilRef.current = now + SCROLL_DWELL_MS;
      }

      lastProgrammaticYRef.current = next;
      window.scrollTo(0, next);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoScrollOn, userPaused]);

  function toggleAutoScroll() {
    setAutoScrollOn((v) => !v);
    setUserPaused(false);
  }

  return { autoScrollOn: autoScrollOn && !userPaused, toggleAutoScroll };
}

function RankRow({
  rank,
  participant,
  delta,
}: {
  rank: number;
  participant: ParticipantTotal;
  delta: number | null;
}) {
  const isFirst = rank === 1;
  const rankColor = rank === 2 ? "var(--lb-silver)" : rank === 3 ? "var(--lb-bronze)" : undefined;
  const isUp = delta !== null && delta > 0;
  const flashColor = delta === null ? null : isUp ? "var(--color-success)" : "var(--color-error)";

  return (
    <motion.div
      animate={
        flashColor
          ? {
              scale: [1, 1.06, 1],
              boxShadow: [
                FLASH_SHADOW_OFF,
                `0 0 0 4px color-mix(in oklch, ${flashColor} 55%, transparent), var(--lb-card-shadow)`,
                FLASH_SHADOW_OFF,
              ],
            }
          : { scale: 1, boxShadow: FLASH_SHADOW_OFF }
      }
      transition={{ duration: BUMP_DURATION_MS / 1000, ease: EASE_OUT_EXPO }}
      className={
        isFirst
          ? "relative flex items-center gap-5 rounded-xl border border-accent bg-accent-subtle px-6 py-6"
          : "relative flex items-center gap-5 rounded-xl border px-6 py-4"
      }
      style={
        isFirst
          ? undefined
          : {
              borderColor: "var(--lb-border)",
              background: "var(--lb-surface)",
              boxShadow: "var(--lb-card-shadow)",
            }
      }
    >
      <span
        className={
          isFirst
            ? "font-mono text-4xl font-bold text-accent-ink"
            : "font-mono text-2xl font-semibold"
        }
        style={isFirst ? undefined : { color: rankColor ?? "var(--lb-muted)" }}
      >
        {rank}
      </span>

      <span
        className={
          isFirst
            ? "flex-1 font-mono text-3xl font-semibold text-ink"
            : "flex-1 font-mono text-xl font-medium text-[var(--lb-ink)]"
        }
      >
        {participant.smo_code}
      </span>

      <span className="relative">
        <span
          className={
            isFirst
              ? "font-mono text-4xl font-bold tabular-nums text-accent-ink"
              : "font-mono text-xl font-semibold tabular-nums text-[var(--lb-ink)]"
          }
        >
          <AnimatedNumber value={participant.total_score} />
        </span>

        <AnimatePresence>
          {delta !== null && (
            <motion.span
              key={`${participant.participant_id}-${delta}-${participant.total_score}`}
              initial={{ opacity: 0, y: 0, scale: 0.8 }}
              animate={{ opacity: 1, y: -30, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: BUMP_DURATION_MS / 1000, ease: EASE_OUT_EXPO }}
              className="pointer-events-none absolute right-0 top-0 font-mono text-lg font-bold"
              style={{ color: flashColor ?? undefined }}
            >
              {isUp ? "+" : ""}
              {delta}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration: 0.6,
      ease: EASE_OUT_EXPO,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value]);

  return <>{display}</>;
}

function LiveIndicator({ isLive }: { isLive: boolean }) {
  return (
    <span className="flex items-center gap-2 text-sm text-[var(--lb-muted)]">
      <span
        className={`h-2 w-2 rounded-full ${isLive ? "bg-success" : ""}`}
        style={isLive ? undefined : { background: "var(--lb-muted)" }}
        aria-hidden
      />
      {isLive ? "เรียลไทม์" : "กำลังเชื่อมต่อ…"}
    </span>
  );
}
