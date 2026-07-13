export function speak(text: string, lang = 'en-US'): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}

interface SpeechRecognitionResultLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor; SpeechRecognition?: SpeechRecognitionCtor };
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

// Records the mic to a blob so the user can compare "my reading" vs. the
// original sentence audio (§4.2 A/B playback).
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
