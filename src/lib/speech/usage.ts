// Azure 語音用量本地估算:按呼叫時長(秒)逐月累計,設定頁展示。
import * as storage from '../storage';

type UsageMap = Record<string, number>; // 'YYYY-MM' → seconds

function monthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addAzureSeconds(seconds: number): void {
  if (seconds <= 0) return;
  const map = storage.get<UsageMap>('speech_usage') ?? {};
  map[monthKey()] = (map[monthKey()] ?? 0) + seconds;
  storage.set('speech_usage', map);
}

export function getMonthAzureSeconds(): number {
  const map = storage.get<UsageMap>('speech_usage') ?? {};
  return Math.round(map[monthKey()] ?? 0);
}
