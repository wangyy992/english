// 當前課程語言:英語是完整家教體驗;粵/韓/法是「詞彙 + 發音」課程(逐步擴建)。
// storage.ts 據此隔離各語言的生詞/複習/詞書等數據。
import * as storage from './storage';
import type { Settings } from '../types';

export type CourseLang = 'en' | 'yue' | 'ko' | 'fr';

export interface CourseLangMeta {
  id: CourseLang;
  name: string;
  /** TTS 與發音評分 locale */
  locale: string;
  /** true = 完整家教(今日規劃/聽說讀寫);false = 詞彙+發音課程 */
  full: boolean;
}

export const COURSE_LANGS: CourseLangMeta[] = [
  { id: 'en', name: '英语', locale: 'en-US', full: true },
  { id: 'yue', name: '粤语', locale: 'zh-HK', full: false },
  { id: 'ko', name: '韩语', locale: 'ko-KR', full: false },
  { id: 'fr', name: '法语', locale: 'fr-FR', full: false },
];

export function courseLangMeta(id: string): CourseLangMeta {
  return COURSE_LANGS.find((l) => l.id === id) ?? COURSE_LANGS[0];
}

/** 讀 settings 裡的當前課程語言(默認 en)。 */
export function getCourseLang(): CourseLang {
  const settings = storage.get<Settings>('settings');
  return (settings?.courseLang as CourseLang) ?? 'en';
}

/** 當前課程語言的 TTS/評分 locale。 */
export function courseLocale(): string {
  return courseLangMeta(getCourseLang()).locale;
}

export function isEnglishCourse(): boolean {
  return getCourseLang() === 'en';
}
