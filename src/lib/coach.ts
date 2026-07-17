// 每日收官 AI 點評:輸入僅當日結構化數據,輸出 ≤3 句。
import { chatJSON } from './deepseek';
import { getAbility } from './ability';
import { buildCoachUserPrompt, COACH_SYSTEM_PROMPT, type CoachInput } from './prompts/coach';
import type { DayPlan } from '../types';

function toCoachInput(plan: DayPlan): CoachInput {
  const doneCount = plan.tasks.filter((t) => t.done).length;
  return {
    date: plan.date,
    totalMinutes: plan.totalMinutes,
    completionRatio: plan.tasks.length > 0 ? doneCount / plan.tasks.length : 0,
    tasks: plan.tasks.map((t) => ({
      module: t.module,
      targetMinutes: t.targetMinutes,
      spentMinutes: Math.round(t.spentMs / 60000),
      done: t.done,
    })),
    abilityScores: getAbility().scores,
  };
}

export async function generateDailyReview(plan: DayPlan): Promise<string> {
  const res = await chatJSON<{ comment: string }>(COACH_SYSTEM_PROMPT, buildCoachUserPrompt(toCoachInput(plan)), {
    temperature: 0.3,
  });
  if (!res || typeof res.comment !== 'string' || !res.comment.trim()) {
    throw new Error('invalid coach comment');
  }
  return res.comment.trim();
}
