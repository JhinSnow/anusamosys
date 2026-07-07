# Product

## Register

product

## Users

Event committee staff ("เจ้าหน้าที่") running an in-person interview/selection day for a
student organization's officer applications. ~96 applicants, each pre-assigned a code
`SMO-0XX`, move through two interview groups on a fixed schedule (7-minute slots). Staff
operate from shared devices — a front-desk tablet/laptop for check-in, another for scoring
during and after interviews. They are not technical; they need speed under time pressure,
since a new applicant arrives roughly every 7 minutes and interviews run back-to-back for
hours. A public/projected leaderboard is watched casually by anyone nearby, not "used" in
the task sense.

## Product Purpose

Two connected staff tools plus one public display:

1. **Check-in board** — staff find each arriving applicant (searchable by nickname or
   SMO code) and log arrival time with one tap.
2. **Staff scoring tool** (gated behind a shared access code) — committee members pick an
   applicant and add points to their running score, transfer-style: tap a preset amount
   (10/20/30) or enter a custom number, optional reason, submits instantly. Scores
   accumulate; they are never a single overwritten grade.
3. **Live leaderboard** — a public, real-time top-5 ranking, the one surface allowed to be
   a visual moment (animated rank changes) rather than purely utilitarian.

Success is staff finding and checking in the right applicant in seconds during a rush, and
scoring feeling as fast and reassuring as a bank-transfer confirmation — clear amount,
clear recipient, clear confirmation, done.

## Brand Personality

Efficient, calm-under-pressure, quietly trustworthy. Mostly utilitarian speed — this is a
tool people operate standing up, mid-conversation, one-handed on a tablet — except the
leaderboard, which is the single permitted moment of visual delight (motion, celebration)
since it's a shared public display, not a task surface.

## Anti-references

- **Generic SaaS template**: cream/gradient heroes, identical card grids, tracked eyebrows,
  hero-metric blocks. Still the primary thing to avoid.
- **Clunky spreadsheet-in-disguise**: this must not feel like a repurposed Google Form or a
  bare admin table. Legacy dense-table admin panels are explicitly rejected — tap targets,
  feedback, and motion should read as considered, not thrown together.

## Design Principles

- **Findable in seconds.** Search must be forgiving — partial nickname or partial SMO code,
  large tap targets, no scrolling through 96 names to find one.
- **Idempotent and forgiving.** No accidental double check-ins or duplicate score
  submissions from a rushed double-tap; mistakes are easy to see and correct.
- **Numbers are always live.** Leaderboard and running totals reflect the database in real
  time — no stale cache, no "refresh to see it update."
- **Staff attribution is invisible until needed.** A staff member's name is captured once
  per device and silently attached to every action after that — never re-typed per action.
- **One moment of delight, not delight everywhere.** The leaderboard is allowed to be
  visually rich; the working tools (check-in, scoring) stay fast and quiet.

## Accessibility & Inclusion

- **WCAG 2.1 AA**: body text ≥ 4.5:1 contrast, large text ≥ 3:1, visible focus states,
  `prefers-reduced-motion` alternative for all motion (the leaderboard's animation
  especially needs a non-animated equivalent).
- **Touch-first, not keyboard-first.** Primary devices are shared tablets/laptops operated
  by tapping while standing. Large touch targets (≥44px) and forgiving hit areas matter
  more here than keyboard shortcuts, though standard keyboard operability is still required
  for laptop use.
