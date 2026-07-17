export type CEFRLevel = 'A2' | 'B1' | 'B2' | 'C1';

export type PlanModule = 'listen' | 'speak' | 'read' | 'write' | 'vocab';

export type PlannerWeights = Record<PlanModule, number>;

export interface PlanTask {
  module: PlanModule;
  targetMinutes: number;
  /** 頁面活躍計時(前台停留) */
  spentMs: number;
  /** listen:音頻實際播放時長 */
  playbackMs?: number;
  /** speak:跟讀錄音次數 */
  recordings?: number;
  done: boolean;
  /** 自報完成(閱讀) */
  selfReported?: boolean;
  meta?: { cards?: number; episodes?: number; writeMode?: 'translate' | 'free' };
}

export interface DebtItem {
  module: PlanModule;
  minutes: number;
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  createdAt: number;
  tasks: PlanTask[];
  /** 昨日未完成的欠账(僅提示) */
  debts: DebtItem[];
  /** 今日 streak 是否已記入(完成率 ≥ 70% 時記一次) */
  checkedIn: boolean;
}

export interface Settings {
  deepseekApiKey: string;
  level: CEFRLevel;
  interests: string[];
  /** 每日新卡上限 */
  dailyNewCards: number;
  /** 上次選擇的今日學習總時長(分鐘) */
  plannerMinutes: number;
  /** Azure 語音服務(留空則用瀏覽器基礎模式) */
  azureRegion: string;
  azureKey: string;
  /** 五模組時長權重(相對值,內部歸一化) */
  plannerWeights: PlannerWeights;
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
