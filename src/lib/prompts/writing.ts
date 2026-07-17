// 寫作批改 prompt(評分類,temperature ≤ 0.3)。出題類 prompt 留在 writing.ts。

export const GRADE_SYSTEM_PROMPT = '你是英语写作批改老师。只输出严格的 JSON,不要任何多余文字或 Markdown 围栏。';

export function buildTranslationGradePrompt(zh: string, answer: string): string {
  return `中文原句:${zh},学生译文:${answer}。只输出 JSON:{"score": 1-5, "errors": [{"original": "错误片段", "suggestion": "改正", "type": "语法|用词|搭配", "explanation": "一句话中文解释"}], "better_version": "更地道的完整译文", "upgrades": [{"phrase": "值得学的表达", "note": "中文说明"}]}`;
}

export function buildFreeWriteGradePrompt(topic: string, essay: string): string {
  return `写作主题:${topic}。学生作文:${essay}。只输出 JSON:{"score": 1-5, "errors": [{"original": "错误片段", "suggestion": "改正", "type": "语法|用词|搭配", "explanation": "一句话中文解释"}], "better_version": "更地道的完整译文", "upgrades": [{"phrase": "值得学的表达", "note": "中文说明"}], "structure_feedback": "一句话结构建议", "rewritten_paragraph": "只重写最弱的一段作示范"}`;
}
