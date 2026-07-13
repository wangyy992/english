// Sole persistence entry point. Backed by localStorage today; swapping to
// Capacitor Preferences / SQLite for the future iOS build only requires
// changing this file.

export type StorageKey =
  | 'vocab'
  | 'progress'
  | 'settings'
  | 'writing_cache'
  | 'srs_log'
  | 'my_articles';

const SCHEMA_VERSION = 1;
const PREFIX = 'siji:';

interface Envelope<T> {
  v: number;
  data: T;
}

// Per-key migration hooks, run when a stored envelope's version is older
// than SCHEMA_VERSION. Empty for now; add entries here as the schema evolves.
const migrations: Partial<Record<StorageKey, (data: unknown, fromVersion: number) => unknown>> = {};

export function get<T>(key: StorageKey): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
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

export function set<T>(key: StorageKey, value: T): void {
  const envelope: Envelope<T> = { v: SCHEMA_VERSION, data: value };
  localStorage.setItem(PREFIX + key, JSON.stringify(envelope));
}

export function remove(key: StorageKey): void {
  localStorage.removeItem(PREFIX + key);
}

const ALL_KEYS: StorageKey[] = ['vocab', 'progress', 'settings', 'writing_cache', 'srs_log', 'my_articles'];

export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ALL_KEYS) {
    const value = get(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

export function importAll(data: Record<string, unknown>): void {
  for (const key of ALL_KEYS) {
    if (key in data) set(key, data[key]);
  }
}

export function clearAll(): void {
  for (const key of ALL_KEYS) remove(key);
}
