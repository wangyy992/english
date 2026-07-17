// 雅思口語模擬 prompt:出題(生成類)與四維評分(評分類,固定 rubric)。

export function buildIeltsQuestionsSystem(part: 1 | 2 | 3): string {
  if (part === 2) {
    return `生成一道雅思口语 Part 2 仿真题(cue card)。只输出 JSON:
{"topic":"Describe ...","bullets":["you should say 的 4 个要点"]}
题目风格贴近真实考试但明确是仿真题,不得复制真题原文。`;
  }
  return `生成 4 道雅思口语 Part ${part} 仿真题(${part === 1 ? '日常话题,简短直接' : '与一个主题相关的深入讨论题'})。只输出 JSON:
{"questions":["...","...","...","..."]}
风格贴近真实考试但明确是仿真题,不得复制真题原文。`;
}

export const IELTS_GRADE_SYSTEM = `你是雅思口语考官。根据考生各题的语音转写,按雅思四维标准评分。只输出 JSON:
{"fluency_coherence":{"band":0-9(可 .5),"evidence":"引用考生原话的中文依据"},
"lexical_resource":{"band":0-9,"evidence":"..."},
"grammatical_range":{"band":0-9,"evidence":"..."},
"pronunciation":{"band":null,"evidence":"发音分由语音评测系统提供,此处置 null"}}
规则:evidence 必须引用考生实际说过的词句;转写过短或跑题要如实反映在分数里;不得编造考生没说的内容。`;

export function buildIeltsGradePrompt(part: number, qa: { question: string; answer: string }[]): string {
  return JSON.stringify({ part, responses: qa });
}
