// Azure 發音評分 Provider。SDK 體積大,動態 import 保持首屏輕量。
// 跟讀用 scripted 模式(帶參考文本 + miscue),自由口說用連續識別。
import * as storage from '../storage';
import type { Settings } from '../../types';
import { addAzureSeconds } from './usage';
import type {
  PhonemeResult,
  PronunciationResult,
  SpeechProvider,
  UnscriptedSession,
  WordErrorType,
  WordResult,
} from './types';

type Sdk = typeof import('microsoft-cognitiveservices-speech-sdk');

let sdkPromise: Promise<Sdk> | null = null;

function loadSdk(): Promise<Sdk> {
  sdkPromise ??= import('microsoft-cognitiveservices-speech-sdk');
  return sdkPromise;
}

export function getAzureCredentials(): { region: string; key: string } | null {
  const settings = storage.get<Settings>('settings');
  const region = settings?.azureRegion?.trim();
  const key = settings?.azureKey?.trim();
  return region && key ? { region, key } : null;
}

// Azure 詳細結果 JSON(NBest[0].Words)的最小類型
interface AzureWordJson {
  Word: string;
  PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string };
  Phonemes?: { Phoneme?: string; PronunciationAssessment?: { AccuracyScore?: number } }[];
}

function mapErrorType(raw: string | undefined): WordErrorType {
  switch (raw) {
    case 'Omission':
      return 'omission';
    case 'Insertion':
      return 'insertion';
    case 'Mispronunciation':
      return 'mispronunciation';
    default:
      return 'none';
  }
}

function parseWords(detailJson: string): WordResult[] {
  const detail = JSON.parse(detailJson) as { NBest?: { Words?: AzureWordJson[] }[] };
  const words = detail.NBest?.[0]?.Words ?? [];
  return words.map((w) => ({
    word: w.Word,
    score: w.PronunciationAssessment?.AccuracyScore ?? null,
    errorType: mapErrorType(w.PronunciationAssessment?.ErrorType),
    phonemes: (w.Phonemes ?? []).map(
      (p): PhonemeResult => ({ phoneme: p.Phoneme ?? '', score: p.PronunciationAssessment?.AccuracyScore ?? 0 }),
    ),
  }));
}

function makeRecognizer(sdk: Sdk, referenceText: string | null, locale = 'en-US') {
  const cred = getAzureCredentials();
  if (!cred) throw new Error('Azure credentials not configured');
  const speechConfig = sdk.SpeechConfig.fromSubscription(cred.key, cred.region);
  speechConfig.speechRecognitionLanguage = locale;
  const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  const paConfig = new sdk.PronunciationAssessmentConfig(
    referenceText ?? '',
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    referenceText !== null, // scripted 才啟用 miscue
  );
  paConfig.applyTo(recognizer);
  return recognizer;
}

export const azureProvider: SpeechProvider = {
  id: 'azure',

  available(): Promise<boolean> {
    return Promise.resolve(getAzureCredentials() !== null);
  },

  async assessScripted(referenceText: string, locale = 'en-US'): Promise<PronunciationResult> {
    const sdk = await loadSdk();
    const recognizer = makeRecognizer(sdk, referenceText, locale);
    const startedAt = Date.now();

    try {
      const result = await new Promise<import('microsoft-cognitiveservices-speech-sdk').SpeechRecognitionResult>(
        (resolve, reject) => {
          recognizer.recognizeOnceAsync(resolve, (err) => reject(new Error(err)));
        },
      );
      if (result.reason !== sdk.ResultReason.RecognizedSpeech) {
        throw new Error(`Azure recognition failed (reason ${result.reason})`);
      }
      const pa = sdk.PronunciationAssessmentResult.fromResult(result);
      const detailJson = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
      return {
        provider: 'azure',
        overall: pa.pronunciationScore,
        accuracy: pa.accuracyScore,
        fluency: pa.fluencyScore,
        completeness: pa.completenessScore,
        words: detailJson ? parseWords(detailJson) : [],
        transcript: result.text,
      };
    } finally {
      addAzureSeconds((Date.now() - startedAt) / 1000);
      recognizer.close();
    }
  },

  async startUnscripted(locale = 'en-US'): Promise<UnscriptedSession> {
    const sdk = await loadSdk();
    const recognizer = makeRecognizer(sdk, null, locale);
    const startedAt = Date.now();

    const transcripts: string[] = [];
    const pronScores: number[] = [];
    const fluencyScores: number[] = [];

    recognizer.recognized = (_s, e) => {
      if (e.result.reason !== sdk.ResultReason.RecognizedSpeech || !e.result.text) return;
      transcripts.push(e.result.text);
      try {
        const pa = sdk.PronunciationAssessmentResult.fromResult(e.result);
        if (Number.isFinite(pa.pronunciationScore)) pronScores.push(pa.pronunciationScore);
        if (Number.isFinite(pa.fluencyScore)) fluencyScores.push(pa.fluencyScore);
      } catch {
        // 無評分明細時只保留轉寫
      }
    };

    await new Promise<void>((resolve, reject) => {
      recognizer.startContinuousRecognitionAsync(resolve, (err) => reject(new Error(err)));
    });

    const finish = async () => {
      await new Promise<void>((resolve) => {
        recognizer.stopContinuousRecognitionAsync(resolve, () => resolve());
      });
      addAzureSeconds((Date.now() - startedAt) / 1000);
      recognizer.close();
    };

    const avg = (xs: number[]) => (xs.length > 0 ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

    return {
      async stop() {
        await finish();
        return {
          provider: 'azure' as const,
          transcript: transcripts.join(' ').trim(),
          overall: avg(pronScores),
          fluency: avg(fluencyScores),
        };
      },
      cancel() {
        void finish();
      },
    };
  },
};

/** 設定頁「測試連接」:用 key 換一次性 token,不產生識別費用。 */
export async function testAzureConnection(region: string, key: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': key },
    });
    if (res.ok) return { ok: true, message: '连接成功' };
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Key 无效或 Region 不匹配' };
    return { ok: false, message: `连接失败 (${res.status})` };
  } catch {
    return { ok: false, message: '网络错误,请检查 Region 与网络' };
  }
}
