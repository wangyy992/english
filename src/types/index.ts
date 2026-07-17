export type CEFRLevel = 'A2' | 'B1' | 'B2' | 'C1';

export interface Settings {
  deepseekApiKey: string;
  level: CEFRLevel;
  interests: string[];
  /** 每日新卡上限 */
  dailyNewCards: number;
}

export type SrsStateName = 'new' | 'learning' | 'review' | 'relearning';

// FSRS card state (ts-fsrs Card, dates as epoch ms so it serialises to JSON).
export interface SrsState {
  due: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: SrsStateName;
  lastReview?: number;
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
  srs: SrsState;
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
  /** FSRS 四鍵評分;遷移前的老日誌無此欄位(存的是 result/fromStage/toStage) */
  rating?: 'again' | 'hard' | 'good' | 'easy';
  fromState?: SrsStateName;
  toState?: SrsStateName;
}

export const DEFAULT_INTERESTS = ['音乐', '游戏', '科技', '日常生活'];
