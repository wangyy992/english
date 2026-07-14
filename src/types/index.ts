export type CEFRLevel = 'A2' | 'B1' | 'B2' | 'C1';

export interface Settings {
  deepseekApiKey: string;
  level: CEFRLevel;
  interests: string[];
}

export interface VocabEntry {
  id: string;
  term: string;
  phonetic?: string;
  defEn?: string;
  defZh?: string;
  context: string;
  source: { module: 'listen' | 'read' | 'write'; materialId: string };
  addedAt: number;
  srs: {
    stage: 0 | 1 | 2 | 3 | 4;
    nextReview: number;
    lapses: number;
    graduated?: boolean;
  };
}

export interface AudioLesson {
  id: string;
  source: string;
  title: string;
  level: 1 | 2 | 3;
  audioUrl: string;
  sentences: { start: number; end: number; text: string }[];
}

export interface Article {
  id: string;
  title: string;
  level: CEFRLevel;
  topic: string;
  paragraphs: string[];
  // Present on daily-fetched articles: attribution for republished content.
  sourceName?: string;
  sourceUrl?: string;
}

export interface MyArticle extends Article {
  createdAt: number;
  isCustom: true;
}

export type SelfRating = 'good' | 'half' | 'poor';

export interface DailyLog {
  date: string; // YYYY-MM-DD
  listen?: boolean;
  read?: boolean;
  write?: boolean;
  reviewCleared?: boolean;
}

export interface ProgressData {
  streak: number;
  lastActiveDate: string | null;
  logs: Record<string, DailyLog>;
  completedLessonIds: string[];
  completedArticleIds: string[];
  listeningRatings: Record<string, SelfRating>;
}

export interface TranslationItem {
  zh: string;
  reference_en: string;
}

export interface TranslationResult {
  score: number;
  errors: { original: string; suggestion: string; type: string; explanation: string }[];
  better_version: string;
  upgrades: { phrase: string; note: string }[];
}

export interface FreeWriteResult extends TranslationResult {
  structure_feedback: string;
  rewritten_paragraph: string;
}

export interface FreeWriteTopic {
  topic: string;
  questions: [string, string];
}

export interface WritingCache {
  translationSet: TranslationItem[];
  generatedAt: number;
  answers: Record<number, { answer: string; result?: TranslationResult }>;
  freeWriteTopics?: FreeWriteTopic[];
  freeWriteTopicsGeneratedAt?: number;
}

export interface SrsLogEntry {
  entryId: string;
  at: number;
  result: 'unknown' | 'vague' | 'known';
  fromStage: number;
  toStage: number;
}

export const DEFAULT_INTERESTS = ['音乐', '游戏', '科技', '日常生活'];
