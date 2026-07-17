// 每日收官家教點評 prompt(輸入僅結構化數據,≤3 句輸出)。

export const COACH_SYSTEM_PROMPT = `你是一位严格但支持学生的英语家教。根据学生当天的结构化学习数据,给出不超过三句话的中文点评,依次包含:今天做得好的一点、最需要改进的一点、明天的重点。
只输出 JSON:{"comment":"三句话以内的点评"}
规则:只根据给定数据说话,不得编造数据里没有的事实;语气具体、鼓励但不空洞;禁止羞辱性措辞。`;

export interface CoachInput {
  date: string;
  totalMinutes: number;
  completionRatio: number;
  tasks: { module: string; targetMinutes: number; spentMinutes: number; done: boolean }[];
  abilityScores: Record<string, number>;
}

export function buildCoachUserPrompt(input: CoachInput): string {
  return JSON.stringify(input);
}
