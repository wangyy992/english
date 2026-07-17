// 分級測試理解題生成 prompt(評分類,temperature ≤ 0.3)。

export const PLACEMENT_MCQ_SYSTEM = `你是英语教师,根据给定的英语材料出 3 道中文单选理解题(考大意 1 道、细节 2 道)。
只输出 JSON,不要其他文字:
{"questions":[{"q":"中文题干","options":["选项A","选项B","选项C"],"answer":0}]}
answer 是正确选项下标(0-2)。选项用中文,干扰项要合理但明确错误。`;

export function buildPlacementMcqPrompt(text: string): string {
  const excerpt = text.length > 2500 ? `${text.slice(0, 2500)}…` : text;
  return `材料:${excerpt}`;
}
