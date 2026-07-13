import type { VocabEntry } from '../types';

// Interval table indexed by stage (days until next review after landing on
// that stage). Stage 0 means "due today" — used for brand-new cards and
// cards that were just forgotten.
const INTERVAL_DAYS = [0, 1, 3, 7, 14] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ReviewResult = 'unknown' | 'vague' | 'known';

export function applyReview(entry: VocabEntry, result: ReviewResult): VocabEntry {
  const { srs } = entry;

  if (result === 'known') {
    if (srs.stage === 4) {
      return { ...entry, srs: { ...srs, graduated: true } };
    }
    const nextStage = (srs.stage + 1) as 1 | 2 | 3 | 4;
    return {
      ...entry,
      srs: { ...srs, stage: nextStage, nextReview: Date.now() + INTERVAL_DAYS[nextStage] * DAY_MS },
    };
  }

  if (result === 'vague') {
    return { ...entry, srs: { ...srs, nextReview: Date.now() + DAY_MS } };
  }

  // unknown
  return {
    ...entry,
    srs: { ...srs, stage: 0, nextReview: Date.now(), lapses: srs.lapses + 1, graduated: false },
  };
}
