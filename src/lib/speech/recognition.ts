// 低層瀏覽器語音工具:TTS 朗讀、SpeechRecognition 封裝、錄音器。
// 原 src/lib/speech.ts 遷移至此,對外經 speech/index.ts 再導出。

/** 依次朗讀多句(盲聽整段用)。返回停止函數;每句開始時回調 index。 */
export function speakSequence(
  texts: string[],
  lang = 'en-US',
  onIndex?: (i: number) => void,
  onEnd?: () => void,
): () => void {
  if (!('speechSynthesis' in window)) {
    onEnd?.();
    return () => {};
  }
  window.speechSynthesis.cancel();
  let stopped = false;
  let i = 0;
  const next = () => {
    if (stopped || i >= texts.length) {
      if (!stopped) onEnd?.();
      return;
    }
    onIndex?.(i);
    const u = new SpeechSynthesisUtterance(texts[i]);
    u.lang = lang;
    u.onend = () => {
      i++;
      next();
    };
    u.onerror = () => {
      i++;
      next();
    };
    window.speechSynthesis.speak(u);
  };
  next();
  return () => {
    stopped = true;
    window.speechSynthesis.cancel();
  };
}

export function speak(text: string, lang = 'en-US'): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal?: boolean; [alt: number]: { transcript: string } };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null;
}

export function canRecognizeSpeech(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

// Resolves with the recognized transcript once the browser detects the end
// of speech. Rejects if unsupported, denied, or nothing was recognized.
export function recognizeOnce(lang = 'en-US'): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      reject(new Error('speech recognition not supported'));
      return;
    }
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let settled = false;
    recognition.onresult = (event) => {
      settled = true;
      resolve(event.results[0][0].transcript);
    };
    recognition.onerror = (event) => {
      if (!settled) {
        settled = true;
        reject(new Error(event.error ?? 'recognition error'));
      }
    };
    recognition.onend = () => {
      if (!settled) reject(new Error('no speech recognized'));
    };
    recognition.start();
  });
}

export interface ContinuousRecognition {
  /** 停止並返回累計轉寫 */
  stop(): Promise<string>;
  cancel(): void;
}

// 連續識別(復述等長錄音)。累計 final 片段,stop() 後返回全文。
export function startContinuousRecognition(lang = 'en-US'): ContinuousRecognition {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) throw new Error('speech recognition not supported');
  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const finals: string[] = [];
  let onended: (() => void) | null = null;
  let ended = false;

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal !== false) finals.push(r[0].transcript);
    }
  };
  recognition.onerror = () => {};
  recognition.onend = () => {
    ended = true;
    onended?.();
  };
  recognition.start();

  return {
    stop() {
      return new Promise<string>((resolve) => {
        const finish = () => resolve(finals.join(' ').trim());
        if (ended) {
          finish();
          return;
        }
        onended = finish;
        recognition.stop();
        // Safety net: some engines can delay/skip onend
        setTimeout(finish, 3000);
      });
    },
    cancel() {
      recognition.abort?.();
      recognition.stop();
    },
  };
}

// Records the mic to a blob so the user can compare "my reading" vs. the
// original sentence audio.
export class Recorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const recorder = this.mediaRecorder;
      const stream = this.stream;
      if (!recorder) {
        resolve(new Blob());
        return;
      }
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: 'audio/webm' }));
        stream?.getTracks().forEach((t) => t.stop());
      };
      recorder.stop();
    });
  }
}
