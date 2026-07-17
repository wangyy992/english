// 今日時長規劃器:把用戶選擇的學習總時長按權重分配到五個模組,
// 生成當日任務卡並負責計時與完成判定。所有讀寫經 storage.ts。
import * as storage from './storage';
import * as progress from './progress';
import type { DayPlan, DebtItem, PlanModule, PlanTask, PlannerWeights } from '../types';

export const PLAN_MODULES: PlanModule[] = ['listen', 'speak', 'read', 'write', 'vocab'];

export const MODULE_LABEL: Record<PlanModule, string> = {
  listen: '听',
  speak: '说',
  read: '读',
  write: '写',
  vocab: '词汇',
};

export const DEFAULT_WEIGHTS: PlannerWeights = { listen: 30, speak: 20, read: 20, write: 15, vocab: 15 };

/** 每張詞彙卡的估算耗時(秒) */
const CARD_SECONDS = 6;
/** 當日完成率達到該值才算打卡成功 */
export const STREAK_THRESHOLD = 0.7;

export interface PlanContext {
  /** 今日複習隊列長度(到期+新卡) */
  dueCards: number;
  /** 推薦聽力素材時長(分鐘),未知給 0 */
  lessonMinutes: number;
}

function getStored(): DayPlan | null {
  return storage.get<DayPlan>('day_plan');
}

function save(plan: DayPlan): void {
  storage.set('day_plan', plan);
}

export function getTodayPlan(): DayPlan | null {
  const plan = getStored();
  return plan && plan.date === progress.todayKey() ? plan : null;
}

function remainingMinutes(task: PlanTask): number {
  return Math.max(0, Math.round(task.targetMinutes - task.spentMs / 60000));
}

function computeDebts(prev: DayPlan | null): DebtItem[] {
  if (!prev || prev.date >= progress.todayKey()) return [];
  return prev.tasks
    .filter((t) => !t.done && t.targetMinutes > 0 && remainingMinutes(t) > 0)
    .map((t) => ({ module: t.module, minutes: remainingMinutes(t) }));
}

export function createPlan(totalMinutes: number, weights: PlannerWeights, ctx: PlanContext): DayPlan {
  const debts = computeDebts(getStored());
  const weightSum = PLAN_MODULES.reduce((s, m) => s + Math.max(0, weights[m] ?? 0), 0) || 1;
  const minutesFor = (m: PlanModule) => (totalMinutes * Math.max(0, weights[m] ?? 0)) / weightSum;

  const tasks: PlanTask[] = PLAN_MODULES.map((module) => {
    const raw = minutesFor(module);
    const task: PlanTask = { module, targetMinutes: Math.max(1, Math.round(raw)), spentMs: 0, done: false };

    if (module === 'vocab') {
      // 時長換算為卡片數,與到期數取小;無卡可複習則生成時即完成
      const cards = Math.min(ctx.dueCards, Math.floor((raw * 60) / CARD_SECONDS));
      task.meta = { cards };
      task.targetMinutes = Math.max(1, Math.ceil((cards * CARD_SECONDS) / 60));
      if (cards === 0) {
        task.targetMinutes = 0;
        task.done = true;
      }
    } else if (module === 'listen') {
      task.playbackMs = 0;
      task.meta = { episodes: ctx.lessonMinutes > 0 ? Math.max(1, Math.round(raw / ctx.lessonMinutes)) : 1 };
    } else if (module === 'speak') {
      task.recordings = 0;
    } else if (module === 'write') {
      task.meta = { writeMode: raw >= 30 ? 'free' : 'translate' };
    }
    return task;
  });

  const plan: DayPlan = {
    date: progress.todayKey(),
    totalMinutes,
    createdAt: Date.now(),
    tasks,
    debts,
    checkedIn: false,
  };
  save(plan);
  return plan;
}

export function completionRatio(plan: DayPlan): number {
  if (plan.tasks.length === 0) return 0;
  return plan.tasks.filter((t) => t.done).length / plan.tasks.length;
}

// 完成判定:
// - listen:音頻實際播放時長 ≥ 目標(硬驗證,頁面停留不算)
// - speak:活躍時長 ≥ 目標 且 有錄音記錄(硬驗證)
// - read:自報「读完了」即完成,停留時長僅記錄供參考
// - write:提交批改即完成
// - vocab:到期隊列清空即完成
function refreshDone(task: PlanTask): void {
  if (task.done) return;
  const targetMs = task.targetMinutes * 60000;
  if (task.module === 'listen' && (task.playbackMs ?? 0) >= targetMs) task.done = true;
  if (task.module === 'speak' && task.spentMs >= targetMs && (task.recordings ?? 0) > 0) task.done = true;
}

function mutate(module: PlanModule, fn: (task: PlanTask) => void): void {
  const plan = getTodayPlan();
  if (!plan) return;
  const task = plan.tasks.find((t) => t.module === module);
  if (!task) return;
  fn(task);
  refreshDone(task);
  if (!plan.checkedIn && completionRatio(plan) >= STREAK_THRESHOLD) {
    plan.checkedIn = true;
    progress.checkIn();
  }
  save(plan);
}

export function addActiveTime(module: PlanModule, ms: number): void {
  mutate(module, (t) => {
    t.spentMs += ms;
  });
}

export function addListenPlayback(ms: number): void {
  mutate('listen', (t) => {
    t.playbackMs = (t.playbackMs ?? 0) + ms;
  });
}

export function addSpeakRecording(): void {
  mutate('speak', (t) => {
    t.recordings = (t.recordings ?? 0) + 1;
  });
}

export function notifyWriteSubmitted(): void {
  mutate('write', (t) => {
    t.done = true;
  });
}

export function notifyVocabCleared(): void {
  mutate('vocab', (t) => {
    t.done = true;
  });
}

export function selfReportRead(): void {
  mutate('read', (t) => {
    t.done = true;
    t.selfReported = true;
  });
}

/**
 * 模組活躍計時:進入模組開始,離開(cleanup)停止;頁面切後台/鎖屏
 * 自動暫停。每秒直接落 storage,刷新不丟計時。
 * 用法:useEffect(() => planner.trackModule('read'), [])
 */
export function trackModule(module: PlanModule): () => void {
  const id = window.setInterval(() => {
    if (document.visibilityState === 'visible') addActiveTime(module, 1000);
  }, 1000);
  return () => window.clearInterval(id);
}
