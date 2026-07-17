// 免費降級 Provider:瀏覽器 SpeechRecognition + 詞級 LCS diff。
// 只產出詞級對/錯(errorType),不產出任何分數;UI 顯示「基礎模式」。
import { diffAgainstOriginal } from '../diff';
import { canRecognizeSpeech, recognizeOnce, startContinuousRecognition } from './recognition';
import type { PronunciationResult, SpeechProvider, UnscriptedSession, WordResult } from './types';

export const browserProvider: SpeechProvider = {
  id: 'browser',

  available(): Promise<boolean> {
    return Promise.resolve(canRecognizeSpeech());
  },

  async assessScripted(referenceText: string, locale = 'en-US'): Promise<PronunciationResult> {
    const transcript = await recognizeOnce(locale);
    const words: WordResult[] = diffAgainstOriginal(referenceText, transcript).map((tok) => ({
      word: tok.text,
      score: null,
      errorType: tok.matched ? 'none' : 'omission',
      phonemes: [],
    }));
    return {
      provider: 'browser',
      overall: null,
      accuracy: null,
      fluency: null,
      completeness: null,
      words,
      transcript,
    };
  },

  startUnscripted(locale = 'en-US'): Promise<UnscriptedSession> {
    const rec = startContinuousRecognition(locale);
    return Promise.resolve({
      async stop() {
        const transcript = await rec.stop();
        return { provider: 'browser' as const, transcript, overall: null, fluency: null };
      },
      cancel() {
        rec.cancel();
      },
    });
  },
};
