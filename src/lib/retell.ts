// 復述批改:轉寫 + 原文 → DeepSeek 固定 rubric JSON。
import { chatJSON } from './deepseek';
import { buildRetellUserPrompt, RETELL_SYSTEM_PROMPT } from './prompts/retell';

export interface RetellResult {
  coverage: number; // 0-5
  grammar_issues: { original: string; fixed: string }[];
  upgrades: { phrase: string; note: string }[];
  summary: string;
}

function isValidRetellResult(r: unknown): r is RetellResult {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  return (
    typeof o.coverage === 'number' &&
    o.coverage >= 0 &&
    o.coverage <= 5 &&
    Array.isArray(o.grammar_issues) &&
    o.grammar_issues.every(
      (g) => g && typeof (g as Record<string, unknown>).original === 'string' && typeof (g as Record<string, unknown>).fixed === 'string',
    ) &&
    Array.isArray(o.upgrades) &&
    o.upgrades.every(
      (u) => u && typeof (u as Record<string, unknown>).phrase === 'string' && typeof (u as Record<string, unknown>).note === 'string',
    ) &&
    typeof o.summary === 'string'
  );
}

export async function gradeRetelling(originalText: string, transcript: string): Promise<RetellResult> {
  const userPrompt = buildRetellUserPrompt(originalText, transcript);
  let lastError: unknown;
  // chatJSON 內部已對 JSON 解析失敗重試;這裡再對 schema 校驗失敗重試一次
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await chatJSON<RetellResult>(RETELL_SYSTEM_PROMPT, userPrompt, { temperature: 0.2 });
      if (isValidRetellResult(result)) {
        return {
          ...result,
          coverage: Math.round(result.coverage),
          grammar_issues: result.grammar_issues.slice(0, 5),
          upgrades: result.upgrades.slice(0, 3),
        };
      }
      lastError = new Error('retell result failed schema validation');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('retell grading failed');
}
