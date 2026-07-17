// 獎懲系統:積分(連續打卡乘數)+ 里程碑成就。文案原則:嚴格但支持,
// 禁止羞辱性內容與無上限加量。
import * as storage from './storage';
import * as progress from './progress';

export interface RewardsData {
  points: number;
  achievements: { id: string; at: number }[];
}

export interface AchievementDef {
  id: string;
  label: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'streak-7', label: '连续打卡 7 天' },
  { id: 'streak-30', label: '连续打卡 30 天' },
  { id: 'streak-100', label: '连续打卡 100 天' },
  { id: 'vocab-500', label: '生词本 500 词' },
  { id: 'vocab-2000', label: '生词本 2000 词' },
  { id: 'shadow-90', label: '首次跟读 90 分' },
];

export function getRewards(): RewardsData {
  return storage.get<RewardsData>('rewards') ?? { points: 0, achievements: [] };
}

function save(data: RewardsData): void {
  storage.set('rewards', data);
}

/** 連續打卡乘數:1.0 起,每天 +2%,封頂 1.6(30 天)。 */
export function streakMultiplier(): number {
  return 1 + Math.min(progress.getProgress().streak, 30) * 0.02;
}

export function addPoints(base: number): void {
  const data = getRewards();
  data.points += Math.round(base * streakMultiplier());
  save(data);
}

export function hasAchievement(id: string): boolean {
  return getRewards().achievements.some((a) => a.id === id);
}

/** 冪等:已解鎖的成就不重複記。返回是否新解鎖。 */
export function award(id: string): boolean {
  if (!ACHIEVEMENTS.some((a) => a.id === id) || hasAchievement(id)) return false;
  const data = getRewards();
  data.achievements.push({ id, at: Date.now() });
  data.points += 50;
  save(data);
  return true;
}

export function checkStreakAchievements(): void {
  const streak = progress.getProgress().streak;
  if (streak >= 7) award('streak-7');
  if (streak >= 30) award('streak-30');
  if (streak >= 100) award('streak-100');
}

export function checkVocabAchievements(count: number): void {
  if (count >= 500) award('vocab-500');
  if (count >= 2000) award('vocab-2000');
}

export function checkShadowScore(overall: number | null): void {
  if (overall !== null && overall >= 90) award('shadow-90');
}
