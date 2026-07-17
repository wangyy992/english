// Sole AI call entry point. Talks directly to the DeepSeek chat completions
// API using the key stored via storage.ts. Components must never call
// fetch() for AI directly — always go through chatJSON().

import { get, set } from './storage';
import type { Settings } from '../types';

// 本月用量估算(成本護欄):按字符/4 粗估 tokens,本地逐月累計。
type LlmUsageMap = Record<string, number>; // 'YYYY-MM' → est. tokens

function usageMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function recordUsage(chars: number): void {
  const map = get<LlmUsageMap>('llm_usage') ?? {};
  map[usageMonthKey()] = (map[usageMonthKey()] ?? 0) + Math.round(chars / 4);
  set('llm_usage', map);
}

export function getMonthTokenEstimate(): number {
  const map = get<LlmUsageMap>('llm_usage') ?? {};
  return Math.round(map[usageMonthKey()] ?? 0);
}

const ENDPOINT = 'https://api.deepseek.com/chat/completions';

export class DeepSeekKeyMissingError extends Error {
  constructor() {
    super('DeepSeek API key is not configured');
    this.name = 'DeepSeekKeyMissingError';
  }
}

export class DeepSeekRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeepSeekRequestError';
  }
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function getApiKey(): string {
  const settings = get<Settings>('settings');
  const key = settings?.deepseekApiKey?.trim();
  if (!key) throw new DeepSeekKeyMissingError();
  return key;
}

export interface ChatOptions {
  /** 批改/評分類呼叫應 ≤ 0.3;默認 0.7 */
  temperature?: number;
}

async function callOnce(systemPrompt: string, userPrompt: string, apiKey: string, options?: ChatOptions): Promise<string> {
  // isNative branch (future): when running under Capacitor, swap this fetch()
  // for CapacitorHttp.post() to avoid iOS ATS / CORS restrictions. Everything
  // else in this file stays the same.
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    throw new DeepSeekRequestError(`DeepSeek request failed (${res.status})`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new DeepSeekRequestError('Unexpected DeepSeek response shape');
  }
  recordUsage(systemPrompt.length + userPrompt.length + content.length);
  return content;
}

export async function chatJSON<T>(systemPrompt: string, userPrompt: string, options?: ChatOptions): Promise<T> {
  const apiKey = getApiKey();

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callOnce(systemPrompt, userPrompt, apiKey, options);
      return JSON.parse(stripJsonFence(raw)) as T;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new DeepSeekRequestError('DeepSeek call failed');
}

export async function testConnection(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 4,
      }),
    });
    if (res.ok) return { ok: true, message: '连接成功' };
    if (res.status === 401) return { ok: false, message: 'API Key 无效' };
    return { ok: false, message: `连接失败 (${res.status})` };
  } catch {
    return { ok: false, message: '网络错误,请检查连接' };
  }
}

export function hasApiKey(): boolean {
  const settings = get<Settings>('settings');
  return Boolean(settings?.deepseekApiKey?.trim());
}
