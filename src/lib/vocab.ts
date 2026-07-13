import * as storage from './storage';
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
    srs: { stage: 0, nextReview: Date.now(), lapses: 0 },
  };
  saveAll([entry, ...getAll()]);
  return entry;
}

export function updateEntry(id: string, patch: Partial<VocabEntry>): void {
  saveAll(getAll().map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

export function getDueEntries(): VocabEntry[] {
  const now = Date.now();
  return getAll()
    .filter((e) => !e.srs.graduated && e.srs.nextReview <= now)
    .sort((a, b) => a.srs.nextReview - b.srs.nextReview);
}

export function isTermSaved(term: string): boolean {
  const norm = term.trim().toLowerCase();
  return getAll().some((e) => e.term.trim().toLowerCase() === norm);
}

export function logReview(log: SrsLogEntry): void {
  const logs = storage.get<SrsLogEntry[]>('srs_log') ?? [];
  storage.set('srs_log', [...logs, log]);
}

export function toCsv(entries: VocabEntry[]): string {
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const header = ['term', 'defZh', 'defEn', 'context'].join(',');
  const rows = entries.map((e) => [e.term, e.defZh ?? '', e.defEn ?? '', e.context].map(escape).join(','));
  return [header, ...rows].join('\n');
}
