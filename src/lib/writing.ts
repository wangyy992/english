import { chatJSON } from './deepseek';
import * as storage from './storage';
import { buildFreeWriteGradePrompt, buildTranslationGradePrompt, GRADE_SYSTEM_PROMPT } from './prompts/writing';
import type { CEFRLevel, FreeWriteResult, FreeWriteTopic, TranslationItem, TranslationResult, WritingCache } from '../types';

const N_SENTENCES = 5;

function emptyCache(): WritingCache {
  return { translationSet: [], generatedAt: 0, answers: {} };
}

export function getCache(): WritingCache {
  return storage.get<WritingCache>('writing_cache') ?? emptyCache();
}

function saveCache(cache: WritingCache): void {
  storage.set('writing_cache', cache);
}

function pickTopic(interests: string[]): string {
  if (interests.length === 0) return '日常生活';
  return interests[Math.floor(Math.random() * interests.length)];
}

export async function ensureTranslationSet(level: CEFRLevel, interests: string[]): Promise<TranslationItem[]> {
  const cache = getCache();
  if (cache.translationSet.length > 0) return cache.translationSet;
  const items = await chatJSON<TranslationItem[]>(
    '你是英语教学出题人。只输出严格的 JSON 数组,不要任何多余文字或 Markdown 围栏。',
    `生成 ${N_SENTENCES} 个中文句子供学生翻译成英文。难度:${level}。主题:${pickTopic(interests)}。要求:句子自然口语化,15-30 字,包含该难度典型句型。只输出 JSON 数组:[{"zh": "...", "reference_en": "..."}]`,
  );
  saveCache({ translationSet: items, generatedAt: Date.now(), answers: {} });
  return items;
}

export async function regenerateTranslationSet(level: CEFRLevel, interests: string[]): Promise<TranslationItem[]> {
  const cache = getCache();
  saveCache({ ...emptyCache(), freeWriteTopics: cache.freeWriteTopics, freeWriteTopicsGeneratedAt: cache.freeWriteTopicsGeneratedAt });
  return ensureTranslationSet(level, interests);
}

export function saveTranslationAnswer(index: number, answer: string, result?: TranslationResult): void {
  const cache = getCache();
  saveCache({ ...cache, answers: { ...cache.answers, [index]: { answer, result } } });
}

export async function gradeTranslation(zh: string, answer: string): Promise<TranslationResult> {
  return chatJSON<TranslationResult>(GRADE_SYSTEM_PROMPT, buildTranslationGradePrompt(zh, answer), {
    temperature: 0.3,
  });
}

export async function generateFreeWriteTopics(interests: string[]): Promise<FreeWriteTopic[]> {
  const tags = interests.length > 0 ? interests.join('、') : '日常生活';
  const topics = await chatJSON<FreeWriteTopic[]>(
    '你是英语写作教练。只输出严格的 JSON 数组,不要任何多余文字或 Markdown 围栏。',
    `请生成 3 个英语写作主题,主题应关联以下兴趣标签:${tags}。每个主题附带 2 个英文引导问题。只输出 JSON 数组:[{"topic": "...", "questions": ["...", "..."]}]`,
  );
  const cache = getCache();
  saveCache({ ...cache, freeWriteTopics: topics, freeWriteTopicsGeneratedAt: Date.now() });
  return topics;
}

export async function gradeFreeWrite(topic: string, essay: string): Promise<FreeWriteResult> {
  return chatJSON<FreeWriteResult>(GRADE_SYSTEM_PROMPT, buildFreeWriteGradePrompt(topic, essay), {
    temperature: 0.3,
  });
}
