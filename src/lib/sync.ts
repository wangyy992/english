// 雲同步層:架在 storage.ts 之上,服務端為準、本地為緩存。
// 登錄憑證與同步元數據存獨立 localStorage key,不進導出備份、
// 「清空全部數據」也不清登錄。
import * as storage from './storage';

const CONFIG_KEY = 'siji:sync_config';
const META_KEY = 'siji:sync_meta';
const PUSH_DEBOUNCE_MS = 3000;

export interface SyncConfig {
  url: string;
  email: string;
  token: string;
}

interface SyncMeta {
  version: number;
  lastSyncAt: number;
}

export function getConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as SyncConfig) : null;
  } catch {
    return null;
  }
}

function setConfig(config: SyncConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function logout(): void {
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(META_KEY);
}

export function getMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as SyncMeta) : { version: 0, lastSyncAt: 0 };
  } catch {
    return { version: 0, lastSyncAt: 0 };
  }
}

function setMeta(meta: SyncMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export async function requestCode(url: string, email: string): Promise<{ devCode?: string }> {
  const res = await fetch(`${normalizeUrl(url)}/auth/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; devCode?: string };
  if (!res.ok) throw new Error(body.error ?? `发送失败 (${res.status})`);
  return { devCode: body.devCode };
}

export async function verifyCode(url: string, email: string, code: string): Promise<void> {
  const res = await fetch(`${normalizeUrl(url)}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; token?: string };
  if (!res.ok || !body.token) throw new Error(body.error ?? `登录失败 (${res.status})`);
  setConfig({ url: normalizeUrl(url), email: email.trim().toLowerCase(), token: body.token });
  setMeta({ version: 0, lastSyncAt: 0 });
  await pull();
}

interface ServerBlob {
  version: number;
  updatedAt: number;
  payload: Record<string, unknown> | null;
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  const config = getConfig();
  if (!config) throw new Error('未登录');
  return fetch(`${config.url}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}`, ...init?.headers },
  });
}

/** 拉取:服務端有數據且版本更新 → 覆蓋本地;服務端為空 → 推送本地。 */
export async function pull(): Promise<void> {
  const res = await api('/sync');
  if (res.status === 401) {
    throw new Error('登录已过期,请重新登录');
  }
  if (!res.ok) throw new Error(`同步失败 (${res.status})`);
  const blob = (await res.json()) as ServerBlob;
  if (blob.payload && blob.version !== getMeta().version) {
    storage.mutateSilently(() => storage.importAll(blob.payload as Record<string, unknown>));
    setMeta({ version: blob.version, lastSyncAt: Date.now() });
    return;
  }
  if (!blob.payload) {
    await push(); // 首次登錄:雲端為空,把本地推上去
    return;
  }
  setMeta({ version: blob.version, lastSyncAt: Date.now() });
}

let pushing = false;

export async function push(): Promise<void> {
  if (pushing) return;
  pushing = true;
  try {
    const res = await api('/sync', {
      method: 'PUT',
      body: JSON.stringify({ baseVersion: getMeta().version, payload: storage.exportAll() }),
    });
    if (res.status === 409) {
      // 服務端為準:版本落後時放棄本地推送,拉取服務端覆蓋
      await pull();
      return;
    }
    if (!res.ok) throw new Error(`同步失败 (${res.status})`);
    const body = (await res.json()) as { version: number };
    setMeta({ version: body.version, lastSyncAt: Date.now() });
  } finally {
    pushing = false;
  }
}

let started = false;

/** App 啟動時調用:已登錄則拉取一次,並訂閱本地變更做防抖推送。 */
export function start(): void {
  if (started || !getConfig()) return;
  started = true;
  pull().catch(() => {});
  let timer: number | null = null;
  storage.onChange(() => {
    if (!getConfig()) return;
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      push().catch(() => {});
    }, PUSH_DEBOUNCE_MS);
  });
}
