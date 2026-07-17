import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { SrsLogEntry, SrsState, SrsStateName, VocabEntry } from '../types';

export type ReviewResult = 'again' | 'hard' | 'good' | 'easy';

export const REVIEW_RESULTS: ReviewResult[] = ['again', 'hard', 'good', 'easy'];

const RATING: Record<ReviewResult, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const STATE_NAME: Record<State, SrsStateName> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

const NAME_STATE: Record<SrsStateName, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

const scheduler = fsrs();

function fromCard(card: Card): SrsState {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_NAME[card.state],
    lastReview: card.last_review?.getTime(),
  };
}

function toCard(srs: SrsState): Card {
  return {
    due: new Date(srs.due),
    stability: srs.stability,
    difficulty: srs.difficulty,
    elapsed_days: 0,
    scheduled_days: srs.scheduledDays,
    learning_steps: srs.learningSteps,
    reps: srs.reps,
    lapses: srs.lapses,
    state: NAME_STATE[srs.state],
    last_review: srs.lastReview !== undefined ? new Date(srs.lastReview) : undefined,
  };
}

export function newSrsState(now: number = Date.now()): SrsState {
  return fromCard(createEmptyCard(now));
}

export function applyReview(entry: VocabEntry, result: ReviewResult, now: number = Date.now()): VocabEntry {
  const { card } = scheduler.next(toCard(entry.srs), now, RATING[result]);
  return { ...entry, srs: fromCard(card) };
}

// ---- Legacy (Leitner) → FSRS migration ----

interface LegacySrs {
  stage: 0 | 1 | 2 | 3 | 4;
  nextReview: number;
  lapses: number;
  graduated?: boolean;
}

// Stability seed for cards that were already in review: the interval (days)
// the old stage table would have given them.
const STAGE_STABILITY: Record<number, number> = { 2: 3, 3: 7, 4: 14 };
const GRADUATED_STABILITY = 30;
const DEFAULT_DIFFICULTY = 5;

export function isLegacySrs(srs: unknown): srs is LegacySrs {
  if (!srs || typeof srs !== 'object') return false;
  const s = srs as Record<string, unknown>;
  return typeof s.stage === 'number' && typeof s.stability !== 'number';
}

export function migrateLegacySrs(legacy: LegacySrs): SrsState {
  const due = typeof legacy.nextReview === 'number' ? legacy.nextReview : Date.now();
  const lapses = typeof legacy.lapses === 'number' ? legacy.lapses : 0;

  if (legacy.stage <= 0) {
    return { ...newSrsState(due), lapses };
  }
  if (legacy.stage === 1) {
    return {
      due,
      stability: 1,
      difficulty: DEFAULT_DIFFICULTY,
      scheduledDays: 1,
      learningSteps: 1,
      reps: 1,
      lapses,
      state: 'learning',
    };
  }
  const stability = legacy.graduated ? GRADUATED_STABILITY : (STAGE_STABILITY[legacy.stage] ?? 14);
  return {
    due,
    stability,
    difficulty: DEFAULT_DIFFICULTY,
    scheduledDays: stability,
    learningSteps: 0,
    reps: legacy.stage,
    lapses,
    state: 'review',
  };
}

// Idempotent: entries already in FSRS shape pass through untouched.
export function migrateVocabData(data: unknown): unknown {
  if (!Array.isArray(data)) return data;
  return data.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const e = entry as { srs?: unknown };
    if (isLegacySrs(e.srs)) return { ...entry, srs: migrateLegacySrs(e.srs) };
    return entry;
  });
}

// ---- Daily stats helpers ----

export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
  );
}

export function endOfToday(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Unique new cards first studied today (for the daily new-card cap). */
export function countNewIntroducedToday(logs: SrsLogEntry[], now: number = Date.now()): number {
  const ids = new Set<string>();
  for (const log of logs) {
    if (log.fromState === 'new' && isSameDay(log.at, now)) ids.add(log.entryId);
  }
  return ids.size;
}

/** Unique cards reviewed today (for the review-page header). */
export function countReviewedToday(logs: SrsLogEntry[], now: number = Date.now()): number {
  const ids = new Set<string>();
  for (const log of logs) {
    if (isSameDay(log.at, now)) ids.add(log.entryId);
  }
  return ids.size;
}
