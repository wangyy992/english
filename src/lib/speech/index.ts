// 語音層唯一入口:組件一律 import 本模組。
// 有 Azure 配置優先 Azure,呼叫失敗自動降級 browser,不報錯不阻斷。
import { browserProvider } from './browser';
import { azureProvider, getAzureCredentials } from './azure';
import type { PronunciationResult, SpeechProviderId, UnscriptedSession } from './types';

export { speak, canRecognizeSpeech, recognizeOnce, Recorder } from './recognition';
export { testAzureConnection } from './azure';
export { getMonthAzureSeconds } from './usage';
export type * from './types';

export function getActiveProviderId(): SpeechProviderId {
  return getAzureCredentials() ? 'azure' : 'browser';
}

/** 跟讀評分,自動選擇 Provider 並降級。 */
export async function assessScripted(referenceText: string): Promise<PronunciationResult> {
  if (getAzureCredentials()) {
    try {
      return await azureProvider.assessScripted(referenceText);
    } catch {
      // Azure 失敗(斷網/配額/憑證):麥克風會話已結束,無法用瀏覽器
      // 重評同一次發音,返回無分數結果讓 UI 落到「僅錄音對比」而不報錯。
      return {
        provider: 'browser',
        overall: null,
        accuracy: null,
        fluency: null,
        completeness: null,
        words: [],
        transcript: '',
      };
    }
  }
  return browserProvider.assessScripted(referenceText);
}

/** 自由口說(復述),自動選擇 Provider 並降級。 */
export async function startUnscripted(): Promise<UnscriptedSession> {
  if (getAzureCredentials()) {
    try {
      return await azureProvider.startUnscripted();
    } catch {
      // 啟動失敗立刻降級瀏覽器識別
    }
  }
  return browserProvider.startUnscripted();
}

export function canAssess(): boolean {
  return getAzureCredentials() !== null || browserCanRecognize();
}

function browserCanRecognize(): boolean {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}
