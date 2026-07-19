// 瀏覽器內開源 Whisper 轉寫(@huggingface/transformers,transformers.js)。
// 模型與 WASM 首次從 CDN(huggingface.co / jsDelivr)下載並由瀏覽器緩存。
// 依賴很大,動態 import,不進主 bundle。沙盒連不上 HF/音頻 CDN,故只能在
// 真實瀏覽器驗證;此處保證編譯與降級行為正確。

export interface TranscribeSentence {
  start: number;
  end: number;
  text: string;
}

export type ProgressCb = (msg: string, pct?: number) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let asrPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAsr(onProgress?: ProgressCb): Promise<any> {
  if (!asrPromise) {
    asrPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      // 只從遠端 Hub 取模型,避免嘗試讀本站不存在的本地模型文件
      env.allowLocalModels = false;
      return pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        dtype: 'q8',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (p: any) => {
          if (p?.status === 'progress' && typeof p.progress === 'number') {
            onProgress?.(`下载模型 ${p.file ?? ''}`, Math.round(p.progress));
          } else if (p?.status === 'ready') {
            onProgress?.('模型就绪', 100);
          }
        },
      });
    })().catch((e) => {
      asrPromise = null; // 失敗可重試
      throw e;
    });
  }
  return asrPromise;
}

/**
 * 轉寫一個音頻直鏈為帶時間戳的句子。lang 默認 'yue'(粵語),模型不支持時
 * 退回 'zh'。transformers.js 內部 fetch 該 URL 並解碼——跨域受 CORS 限制,
 * 讀取失敗時拋錯,由 UI 提示換一個允許跨域的直鏈。
 */
export async function transcribeAudioUrl(
  url: string,
  lang = 'yue',
  onProgress?: ProgressCb,
): Promise<TranscribeSentence[]> {
  onProgress?.('加载模型…');
  const asr = await getAsr(onProgress);
  onProgress?.('转写中…(音频越长越久,请耐心等)');

  const opts = {
    task: 'transcribe' as const,
    return_timestamps: true as const,
    chunk_length_s: 30,
    stride_length_s: 5,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let out: any;
  try {
    out = await asr(url, { ...opts, language: lang });
  } catch (e) {
    if (lang === 'yue') {
      out = await asr(url, { ...opts, language: 'zh' });
    } else {
      throw e;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks: any[] = out?.chunks ?? [];
  const sentences = chunks
    .map((c) => ({
      start: Math.round((c.timestamp?.[0] ?? 0) * 100) / 100,
      end: Math.round((c.timestamp?.[1] ?? c.timestamp?.[0] ?? 0) * 100) / 100,
      text: (c.text ?? '').trim(),
    }))
    .filter((s) => s.text);
  onProgress?.('完成', 100);
  return sentences;
}
