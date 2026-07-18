// 內置詞書:按詞頻/主題分檔的單詞列表(public/data/wordbooks/)。選中一本後,
// 每日新卡額度用不完時自動從詞書補詞。按當前課程語言載入不同 decks:
//   en  → public/data/wordbooks/{id}.json,詞條為 string[](釋義翻面懶加載)
//   其他 → public/data/wordbooks/<lang>/{id}.json,詞條為 {w,jyut,zh}[](釋義隨卡)
import * as storage from './storage';
import * as vocab from './vocab';
import { countNewIntroducedToday } from './srs';
import { getCourseLang } from './lang';

export interface WordbookMeta {
  id: string;
  name: string;
  desc: string;
  count: number;
}

/** 帶釋義的詞條(非英語 decks) */
interface RichWord {
  w: string;
  jyut?: string;
  zh?: string;
}

type DeckWord = string | RichWord;

interface WordbookState {
  activeId: string | null;
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

function basePath(): string {
  const lang = getCourseLang();
  return lang === 'en' ? './data/wordbooks' : `./data/wordbooks/${lang}`;
}

// 緩存按語言 + id 分別鍵控
const indexCache = new Map<string, WordbookMeta[]>();
const bookCache = new Map<string, DeckWord[]>();

export async function loadIndex(): Promise<WordbookMeta[]> {
  const lang = getCourseLang();
  const cached = indexCache.get(lang);
  if (cached) return cached;
  const res = await fetch(`${basePath()}/index.json`);
  if (!res.ok) throw new Error('wordbook index unavailable');
  const list = (await res.json()) as WordbookMeta[];
  indexCache.set(lang, list);
  return list;
}

async function loadWords(id: string): Promise<DeckWord[]> {
  const cacheKey = `${getCourseLang()}:${id}`;
  const cached = bookCache.get(cacheKey);
  if (cached) return cached;
  const res = await fetch(`${basePath()}/${id}.json`);
  if (!res.ok) throw new Error('wordbook unavailable');
  const book = (await res.json()) as { words: DeckWord[] };
  bookCache.set(cacheKey, book.words);
  return book.words;
}

function wordText(w: DeckWord): string {
  return typeof w === 'string' ? w : w.w;
}

function addFromDeck(w: DeckWord, deckId: string): void {
  if (typeof w === 'string') {
    vocab.addEntry({ term: w, context: '', source: { module: 'wordbook', materialId: deckId } });
  } else {
    vocab.addEntry({
      term: w.w,
      phonetic: w.jyut,
      defZh: w.zh,
      context: '',
      source: { module: 'wordbook', materialId: deckId },
    });
  }
}

/**
 * 補足今日新卡:新卡額度超過現存新卡數時,從當前詞書取詞建卡(跳過已收錄)。
 * 英語 decks 的釋義由複習卡翻面時懶加載;其他語言隨 deck 帶入。
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
    const w = words[cursor];
    cursor++;
    if (vocab.isTermSaved(wordText(w))) continue;
    addFromDeck(w, state.activeId);
    created++;
  }
  saveState({ ...getState(), cursor: { ...getState().cursor, [state.activeId]: cursor } });
  return created;
}

/** 非英語課程的「查詞」:在當前語言全部 decks 內搜索(漢字/粵拼/中文)。 */
export async function searchLocalWords(query: string): Promise<RichWord[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const index = await loadIndex();
  const all: RichWord[] = [];
  for (const meta of index) {
    const words = await loadWords(meta.id);
    for (const w of words) {
      if (typeof w === 'string') continue;
      all.push(w);
    }
  }
  return all
    .filter(
      (w) => w.w.toLowerCase().includes(q) || (w.jyut ?? '').toLowerCase().includes(q) || (w.zh ?? '').includes(query.trim()),
    )
    .slice(0, 20);
}
