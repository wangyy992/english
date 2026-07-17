// 內置詞書:按詞頻分檔的單詞列表(public/data/wordbooks/,源自 MIT 授權的
// google-10000-english)。選中一本後,每日新卡額度用不完時自動從詞書補詞。
import * as storage from './storage';
import * as vocab from './vocab';
import { countNewIntroducedToday } from './srs';

export interface WordbookMeta {
  id: string;
  name: string;
  desc: string;
  count: number;
}

interface WordbookState {
  activeId: string | null;
  /** 每本書的學習指針(已取到第幾個詞) */
  cursor: Record<string, number>;
}

function getState(): WordbookState {
  return storage.get<WordbookState>('wordbook') ?? { activeId: null, cursor: {} };
}

function saveState(state: WordbookState): void {
  storage.set('wordbook', state);
}

export function getActiveId(): string | null {
  return getState().activeId;
}

export function setActive(id: string | null): void {
  saveState({ ...getState(), activeId: id });
}

export function getCursor(id: string): number {
  return getState().cursor[id] ?? 0;
}

let indexCache: WordbookMeta[] | null = null;

export async function loadIndex(): Promise<WordbookMeta[]> {
  if (indexCache) return indexCache;
  const res = await fetch('./data/wordbooks/index.json');
  if (!res.ok) throw new Error('wordbook index unavailable');
  indexCache = (await res.json()) as WordbookMeta[];
  return indexCache;
}

const bookCache = new Map<string, string[]>();

async function loadWords(id: string): Promise<string[]> {
  const cached = bookCache.get(id);
  if (cached) return cached;
  const res = await fetch(`./data/wordbooks/${id}.json`);
  if (!res.ok) throw new Error('wordbook unavailable');
  const book = (await res.json()) as { words: string[] };
  bookCache.set(id, book.words);
  return book.words;
}

/**
 * 補足今日新卡:新卡額度(每日上限 − 今日已學新卡)超過現存新卡數時,
 * 從當前詞書取詞建卡(跳過已收錄的詞)。釋義由複習卡翻面時懶加載。
 */
export async function ensureDailyFeed(dailyNewCards: number): Promise<number> {
  const state = getState();
  if (!state.activeId) return 0;

  const budget = Math.max(0, dailyNewCards - countNewIntroducedToday(vocab.getLogs()));
  const existingNew = vocab.getAll().filter((e) => e.srs.state === 'new').length;
  const need = budget - existingNew;
  if (need <= 0) return 0;

  const words = await loadWords(state.activeId);
  let cursor = state.cursor[state.activeId] ?? 0;
  let created = 0;
  while (created < need && cursor < words.length) {
    const term = words[cursor];
    cursor++;
    if (vocab.isTermSaved(term)) continue;
    vocab.addEntry({ term, context: '', source: { module: 'wordbook', materialId: state.activeId } });
    created++;
  }
  saveState({ ...getState(), cursor: { ...getState().cursor, [state.activeId]: cursor } });
  return created;
}
