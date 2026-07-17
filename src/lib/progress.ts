import * as storage from './storage';
import type { ProgressData, SelfRating } from '../types';

const EMPTY: ProgressData = {
  streak: 0,
  lastActiveDate: null,
  logs: {},
  completedLessonIds: [],
  completedArticleIds: [],
  listeningRatings: {},
};

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export function getProgress(): ProgressData {
  return storage.get<ProgressData>('progress') ?? EMPTY;
}

function saveProgress(p: ProgressData): void {
  storage.set('progress', p);
}

// Credits today's check-in (streak) at most once per calendar day. Called by
// the planner when the day's completion ratio reaches the streak threshold —
// individual task completion alone no longer bumps the streak.
export function checkIn(): void {
  const p = getProgress();
  const today = todayKey();
  if (p.lastActiveDate === today) return;
  const streak = p.lastActiveDate === yesterdayKey() ? p.streak + 1 : 1;
  saveProgress({ ...p, streak, lastActiveDate: today });
}

export type DailyTask = 'listen' | 'read' | 'write' | 'reviewCleared';

export function markToday(task: DailyTask): void {
  const p = getProgress();
  const today = todayKey();
  const log = p.logs[today] ?? { date: today };
  saveProgress({ ...p, logs: { ...p.logs, [today]: { ...log, [task]: true } } });
}

export function getTodayLog() {
  const p = getProgress();
  return p.logs[todayKey()] ?? { date: todayKey() };
}

export function markLessonDone(id: string): void {
  const p = getProgress();
  if (p.completedLessonIds.includes(id)) return;
  saveProgress({ ...p, completedLessonIds: [...p.completedLessonIds, id] });
}

export function markArticleDone(id: string): void {
  const p = getProgress();
  if (p.completedArticleIds.includes(id)) return;
  saveProgress({ ...p, completedArticleIds: [...p.completedArticleIds, id] });
}

export function setListeningRating(lessonId: string, rating: SelfRating): void {
  const p = getProgress();
  saveProgress({ ...p, listeningRatings: { ...p.listeningRatings, [lessonId]: rating } });
}
