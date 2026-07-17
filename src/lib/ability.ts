// 能力模型:五維分數(0-100),EWMA(α=0.3)隨每次活動更新。
// 讀寫經 storage.ts,key 'ability'。
import * as storage from './storage';
import * as vocab from './vocab';
import type { SelfRating } from '../types';

export type AbilityDim = 'listening' | 'speaking' | 'reading' | 'writing' | 'vocab';

export const ABILITY_DIMS: AbilityDim[] = ['listening', 'speaking', 'reading', 'writing', 'vocab'];

export const DIM_LABEL: Record<AbilityDim, string> = {
  listening: '听',
  speaking: '说',
  reading: '读',
  writing: '写',
  vocab: '词汇',
};

export interface AbilityData {
  scores: Record<AbilityDim, number>;
  /** 分級測試已完成或已跳過 */
  initialized: boolean;
}

const ALPHA = 0.3;

const DEFAULT_ABILITY: AbilityData = {
  scores: { listening: 50, speaking: 50, reading: 50, writing: 50, vocab: 50 },
  initialized: false,
};

export function getAbility(): AbilityData {
  return storage.get<AbilityData>('ability') ?? { ...DEFAULT_ABILITY, scores: { ...DEFAULT_ABILITY.scores } };
}

function save(data: AbilityData): void {
  storage.set('ability', data);
}

/** 分級測試產出初始分;傳 null = 跳過,全部 50。 */
export function initAbility(scores: Partial<Record<AbilityDim, number>> | null): void {
  const data = getAbility();
  if (scores) {
    for (const dim of ABILITY_DIMS) {
      const v = scores[dim];
      if (typeof v === 'number') data.scores[dim] = clamp(v);
    }
  }
  data.initialized = true;
  save(data);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function updateDim(dim: AbilityDim, sample: number): void {
  const data = getAbility();
  data.scores[dim] = clamp(ALPHA * clamp(sample) + (1 - ALPHA) * data.scores[dim]);
  save(data);
}

// ---- 各活動的樣本換算 ----

const SELF_RATING_SAMPLE: Record<SelfRating, number> = { good: 85, half: 60, poor: 35 };

/** 精聽自評 → listening */
export function noteListeningSelfRating(rating: SelfRating): void {
  updateDim('listening', SELF_RATING_SAMPLE[rating]);
}

/**
 * 跟讀結果 → speaking 與 listening。
 * Azure 有 overall 分;browser 模式用詞匹配率折算。
 */
export function noteShadowResult(overall: number | null, matchedRatio: number | null): void {
  const sample = overall ?? (matchedRatio !== null ? matchedRatio * 100 : null);
  if (sample === null) return;
  updateDim('speaking', sample);
  updateDim('listening', sample);
}

/** 復述:內容覆蓋度(0-5)+ 發音分(可選)→ speaking */
export function noteRetellResult(coverage: number, pronunciation: number | null): void {
  const content = (coverage / 5) * 100;
  updateDim('speaking', pronunciation !== null ? (content + pronunciation) / 2 : content);
}

/** 對話/模擬:內容分與發音分(0-100,可各自缺席)→ speaking */
export function noteSpeakingActivity(contentScore: number | null, pronunciation: number | null): void {
  const parts = [contentScore, pronunciation].filter((x): x is number => x !== null);
  if (parts.length === 0) return;
  updateDim('speaking', parts.reduce((a, b) => a + b, 0) / parts.length);
}

/**
 * 閱讀完成 → reading。生詞密度 = 查詞次數/詞數,越低分越高:
 * 0 → 95;每 20 詞查 1 次(0.05)→ 50;≥0.083 → 20。
 */
export function noteReadingFinished(wordCount: number, lookupCount: number): void {
  if (wordCount <= 0) return;
  const density = lookupCount / wordCount;
  updateDim('reading', Math.max(20, Math.min(95, 95 - density * 900)));
}

/** 寫作批改分(rubric 1-5)歸一化 → writing */
export function noteWritingScore(score: number): void {
  updateDim('writing', (score / 5) * 100);
}

/** FSRS 留存率:近 7 日複習正確率(again = 失敗)→ vocab */
export function noteVocabRetention(now: number = Date.now()): void {
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const logs = vocab.getLogs().filter((l) => l.at >= weekAgo && l.rating);
  if (logs.length === 0) return;
  const passed = logs.filter((l) => l.rating !== 'again').length;
  updateDim('vocab', (passed / logs.length) * 100);
}

// ---- 查詞計數(供閱讀密度用,會話級內存即可)----

const lookupCounts = new Map<string, number>();

export function noteLookup(materialId: string): void {
  lookupCounts.set(materialId, (lookupCounts.get(materialId) ?? 0) + 1);
}

export function takeLookupCount(materialId: string): number {
  const n = lookupCounts.get(materialId) ?? 0;
  lookupCounts.delete(materialId);
  return n;
}

// 供 planner 弱項加成使用:分數最低的兩個維度
export function weakestDims(): AbilityDim[] {
  const { scores } = getAbility();
  return [...ABILITY_DIMS].sort((a, b) => scores[a] - scores[b]).slice(0, 2);
}
