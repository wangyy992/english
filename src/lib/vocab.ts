import * as storage from './storage';
import { countNewIntroducedToday, countReviewedToday, newSrsState } from './srs';
import { checkVocabAchievements } from './rewards';
import type { SrsLogEntry, VocabEntry } from '../types';

export function getAll(): VocabEntry[] {
  return storage.get<VocabEntry[]>('vocab') ?? [];
}

function saveAll(entries: VocabEntry[]): void {
  storage.set('vocab', entries);
}

export interface AddEntryInput {
  term: string;
  phonetic?: string;
  defEn?: string;
  defZh?: string;
  context: string;
  source: VocabEntry['source'];
}

export function addEntry(input: AddEntryInput): VocabEntry {
  const entry: VocabEntry = {
    id: crypto.randomUUID(),
    term: input.term,
    phonetic: input.phonetic,
    defEn: input.defEn,
    defZh: input.defZh,
    context: input.context,
    source: input.source,
    addedAt: Date.now(),
    srs: newSrsState(),
  };
  const all = [entry, ...getAll()];
  saveAll(all);
  checkVocabAchievements(all.length);
  return entry;
}

export function updateEntry(id: string, patch: Partial<VocabEntry>): void {
  saveAll(getAll().map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

export interface ReviewQueue {
  entries: VocabEntry[];
  /** 到期複習卡數(不含新卡) */
  dueCount: number;
  /** 今日將學的新卡數(已按每日上限截斷) */
  newCount: number;
  /** 今日已複習卡數 */
  reviewedToday: number;
}

/** 到期複習卡 + 受每日上限約束的新卡。 */
export function getReviewQueue(dailyNewCards: number): ReviewQueue {
  const now = Date.now();
  const all = getAll();
  const logs = getLogs();

  const due = all
    .filter((e) => e.srs.state !== 'new' && e.srs.due <= now)
    .sort((a, b) => a.srs.due - b.srs.due);

  const newBudget = Math.max(0, dailyNewCards - countNewIntroducedToday(logs, now));
  const fresh = all
    .filter((e) => e.srs.state === 'new' && e.srs.due <= now)
    .sort((a, b) => a.addedAt - b.addedAt)
    .slice(0, newBudget);

  return {
    entries: [...due, ...fresh],
    dueCount: due.length,
    newCount: fresh.length,
    reviewedToday: countReviewedToday(logs, now),
  };
}

export function isTermSaved(term: string): boolean {
  const norm = term.trim().toLowerCase();
  return getAll().some((e) => e.term.trim().toLowerCase() === norm);
}

export function getLogs(): SrsLogEntry[] {
  return storage.get<SrsLogEntry[]>('srs_log') ?? [];
}

export function logReview(log: SrsLogEntry): void {
  storage.set('srs_log', [...getLogs(), log]);
}

export function toCsv(entries: VocabEntry[]): string {
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const header = ['term', 'defZh', 'defEn', 'context'].join(',');
  const rows = entries.map((e) => [e.term, e.defZh ?? '', e.defEn ?? '', e.context].map(escape).join(','));
  return [header, ...rows].join('\n');
}
