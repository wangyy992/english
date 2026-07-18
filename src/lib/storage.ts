// Sole persistence entry point. Backed by localStorage today; swapping to
// Capacitor Preferences / SQLite for the future iOS build only requires
// changing this file.
//
// 多語言:部分數據按「當前課程語言」隔離(生詞/複習/詞書/進度等),部分全局
// 共享(設置/用量)。英語(en)沿用歷史裸鍵 `siji:vocab`,零遷移;其他語言
// 加前綴 `siji:yue:vocab`。activeLang 由 main.tsx 啟動時據 settings 設定。

export type StorageKey =
  | 'vocab'
  | 'progress'
  | 'settings'
  | 'writing_cache'
  | 'srs_log'
  | 'my_articles'
  | 'day_plan'
  | 'speech_usage'
  | 'ability'
  | 'rewards'
  | 'plan_history'
  | 'llm_usage'
  | 'wordbook';

import { migrateVocabData } from './srs';

// v1 → v2: vocab entries' srs moved from Leitner {stage, nextReview, graduated}
// to FSRS card state. Migration is per-entry and idempotent.
const SCHEMA_VERSION = 2;
const PREFIX = 'siji:';

// 全局鍵:所有語言共享,永遠裸鍵。
const GLOBAL_KEYS = new Set<StorageKey>(['settings', 'speech_usage', 'llm_usage']);
// 已知課程語言(用於備份/導入遍歷)。'en' 為裸鍵。
export const KNOWN_LANGS = ['en', 'yue', 'ko', 'fr'] as const;

let activeLang = 'en';

/** 由 main.tsx 啟動時、或切換語言時調用。 */
export function setActiveLang(lang: string): void {
  activeLang = lang || 'en';
}

export function getActiveLang(): string {
  return activeLang;
}

function isGlobal(key: StorageKey): boolean {
  return GLOBAL_KEYS.has(key);
}

function physicalKey(key: StorageKey, lang = activeLang): string {
  if (isGlobal(key) || lang === 'en') return PREFIX + key;
  return `${PREFIX}${lang}:${key}`;
}

interface Envelope<T> {
  v: number;
  data: T;
}

// Per-key migration hooks, run when a stored envelope's version is older
// than SCHEMA_VERSION. Must be idempotent: exported backups carry no version,
// so importAll() re-runs them on whatever shape it receives.
const migrations: Partial<Record<StorageKey, (data: unknown, fromVersion: number) => unknown>> = {
  vocab: (data) => migrateVocabData(data),
};

export function get<T>(key: StorageKey): T | null {
  try {
    const phys = physicalKey(key);
    const raw = localStorage.getItem(phys);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as Envelope<T>;
    if (envelope.v !== SCHEMA_VERSION) {
      const migrate = migrations[key];
      if (migrate) {
        const migrated = migrate(envelope.data, envelope.v) as T;
        set(key, migrated);
        return migrated;
      }
    }
    return envelope.data;
  } catch {
    return null;
  }
}

// 變更通知(同步層防抖推送用)。muted 期間(如從服務端導入時)不通知,
// 避免「拉取→寫入→又推送」迴圈。
const changeListeners = new Set<() => void>();
let muted = false;

export function onChange(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

export function mutateSilently(fn: () => void): void {
  muted = true;
  try {
    fn();
  } finally {
    muted = false;
  }
}

function notifyChange(): void {
  if (muted) return;
  for (const listener of changeListeners) listener();
}

export function set<T>(key: StorageKey, value: T): void {
  const envelope: Envelope<T> = { v: SCHEMA_VERSION, data: value };
  localStorage.setItem(physicalKey(key), JSON.stringify(envelope));
  notifyChange();
}

export function remove(key: StorageKey): void {
  localStorage.removeItem(physicalKey(key));
  notifyChange();
}

const ALL_KEYS: StorageKey[] = [
  'vocab',
  'progress',
  'settings',
  'writing_cache',
  'srs_log',
  'my_articles',
  'day_plan',
  'speech_usage',
  'ability',
  'rewards',
  'plan_history',
  'llm_usage',
  'wordbook',
];

const SCOPED_KEYS = ALL_KEYS.filter((k) => !GLOBAL_KEYS.has(k));

function readPhysical<T>(phys: string): T | null {
  try {
    const raw = localStorage.getItem(phys);
    if (!raw) return null;
    return (JSON.parse(raw) as Envelope<T>).data;
  } catch {
    return null;
  }
}

// 導出全部語言的數據 + 全局數據,保持與舊裸鍵備份兼容:
// 全局鍵與 en 作用域鍵用裸名(vocab),其他語言用 `yue:vocab`。
export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of GLOBAL_KEYS) {
    const v = readPhysical(physicalKey(key, 'en'));
    if (v !== null) out[key] = v;
  }
  for (const lang of KNOWN_LANGS) {
    for (const key of SCOPED_KEYS) {
      const v = readPhysical(physicalKey(key, lang));
      if (v !== null) out[lang === 'en' ? key : `${lang}:${key}`] = v;
    }
  }
  return out;
}

function writePhysical(phys: string, value: unknown): void {
  localStorage.setItem(phys, JSON.stringify({ v: SCHEMA_VERSION, data: value }));
}

// 解析導出鍵:`yue:vocab` → {lang:'yue', key:'vocab'};裸鍵 `vocab` → en/全局。
function parseExportKey(k: string): { lang: string; key: StorageKey } | null {
  const colon = k.indexOf(':');
  if (colon > 0) {
    const lang = k.slice(0, colon);
    const key = k.slice(colon + 1) as StorageKey;
    if ((KNOWN_LANGS as readonly string[]).includes(lang) && ALL_KEYS.includes(key)) return { lang, key };
  }
  if (ALL_KEYS.includes(k as StorageKey)) return { lang: 'en', key: k as StorageKey };
  return null;
}

export function importAll(data: Record<string, unknown>): void {
  for (const [rawKey, value] of Object.entries(data)) {
    const parsed = parseExportKey(rawKey);
    if (!parsed) continue;
    const migrate = migrations[parsed.key];
    const finalValue = migrate ? migrate(value, 0) : value;
    const phys = isGlobal(parsed.key) ? physicalKey(parsed.key, 'en') : physicalKey(parsed.key, parsed.lang);
    writePhysical(phys, finalValue);
  }
  notifyChange();
}

// 清空:全局鍵 + 所有語言的作用域鍵。
export function clearAll(): void {
  for (const key of GLOBAL_KEYS) localStorage.removeItem(physicalKey(key, 'en'));
  for (const lang of KNOWN_LANGS) {
    for (const key of SCOPED_KEYS) localStorage.removeItem(physicalKey(key, lang));
  }
  notifyChange();
}
