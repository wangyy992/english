// 語音 Provider 統一介面:組件層一律經 speech/index.ts 呼叫,
// 不得直接使用 SpeechRecognition 或 Azure SDK。

export type SpeechProviderId = 'browser' | 'azure';

export type WordErrorType = 'none' | 'omission' | 'insertion' | 'mispronunciation';

export interface PhonemeResult {
  phoneme: string;
  /** 0-100 */
  score: number;
}

export interface WordResult {
  word: string;
  /** 0-100;browser 模式無分數為 null */
  score: number | null;
  errorType: WordErrorType;
  /** 音素明細,Azure 才有,browser 為空陣列 */
  phonemes: PhonemeResult[];
}

export interface PronunciationResult {
  provider: SpeechProviderId;
  /** 整體分 0-100;browser 為 null */
  overall: number | null;
  accuracy: number | null;
  fluency: number | null;
  completeness: number | null;
  /** 按參考文本詞序(insertion 除外) */
  words: WordResult[];
  /** 識別出的文本 */
  transcript: string;
}

export interface UnscriptedResult {
  provider: SpeechProviderId;
  transcript: string;
  /** 整體發音分 0-100;browser 為 null */
  overall: number | null;
  fluency: number | null;
}

/** 自由口說(復述等)長錄音會話:手動 stop 取結果 */
export interface UnscriptedSession {
  stop(): Promise<UnscriptedResult>;
  cancel(): void;
}

// 註:PRD 原型簽名為 assessScripted(text, audio: Blob)。瀏覽器
// SpeechRecognition 無法評測既有音頻,Azure JS SDK 的推薦路徑也是
// 麥克風串流(規避錄音格式轉換),故介面改為「串流會話」語義:
// scripted 單句自動斷句返回,unscripted 返回會話對象手動停止。
// 錄音 Blob 由呼叫方用 Recorder 並行採集(用於回放對比)。
export interface SpeechProvider {
  id: SpeechProviderId;
  available(): Promise<boolean>;
  /** 跟讀評分:開麥串流,靜音自動結束,返回詞級(及音素級)結果 */
  assessScripted(referenceText: string): Promise<PronunciationResult>;
  /** 自由口說:開麥串流轉寫 + 整體發音/流利度分 */
  startUnscripted(): Promise<UnscriptedSession>;
}
