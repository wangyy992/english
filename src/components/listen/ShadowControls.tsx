import { useRef, useState } from 'react';
import {
  assessScripted,
  canAssess,
  Recorder,
  speak,
  type PronunciationResult,
  type WordResult,
} from '../../lib/speech';
import * as planner from '../../lib/planner';
import * as ability from '../../lib/ability';
import * as rewards from '../../lib/rewards';

type ShadowState =
  | { status: 'idle' }
  | { status: 'recording' }
  | { status: 'result'; result: PronunciationResult | null; recordingUrl: string };

function wordClass(w: WordResult): string {
  if (w.score !== null) {
    if (w.errorType === 'omission') return 'text-red-500 line-through';
    if (w.score >= 80) return 'text-green-600';
    if (w.score >= 60) return 'text-yellow-600';
    return 'text-red-500';
  }
  return w.errorType === 'none' ? 'text-green-600' : 'text-red-500';
}

export default function ShadowControls({
  sentenceText,
  playOriginal,
}: {
  sentenceText: string;
  playOriginal: () => void;
}) {
  const [state, setState] = useState<ShadowState>({ status: 'idle' });
  const [expandedWord, setExpandedWord] = useState<number | null>(null);
  const supported = canAssess();
  const manualRecorderRef = useRef<Recorder | null>(null);

  const startWithAssessment = async () => {
    const recorder = new Recorder();
    try {
      await recorder.start();
    } catch {
      return; // mic permission denied
    }
    setState({ status: 'recording' });
    setExpandedWord(null);
    let result: PronunciationResult | null = null;
    try {
      result = await assessScripted(sentenceText);
    } catch {
      result = null; // 無識別結果:僅保留錄音對比
    }
    const blob = await recorder.stop();
    planner.addSpeakRecording();
    if (result && result.words.length === 0 && !result.transcript) result = null;
    if (result) {
      const matched = result.words.filter((w) => w.errorType === 'none').length;
      ability.noteShadowResult(result.overall, result.words.length > 0 ? matched / result.words.length : null);
      rewards.checkShadowScore(result.overall);
    }
    setState({ status: 'result', result, recordingUrl: URL.createObjectURL(blob) });
  };

  const toggleManualRecording = async () => {
    if (state.status !== 'recording') {
      const recorder = new Recorder();
      try {
        await recorder.start();
      } catch {
        return;
      }
      manualRecorderRef.current = recorder;
      setState({ status: 'recording' });
    } else {
      const blob = await manualRecorderRef.current?.stop();
      planner.addSpeakRecording();
      setState({ status: 'result', result: null, recordingUrl: URL.createObjectURL(blob ?? new Blob()) });
    }
  };

  const handleClick = () => {
    if (supported) startWithAssessment();
    else toggleManualRecording();
  };

  const result = state.status === 'result' ? state.result : null;
  const isAzure = result?.provider === 'azure';

  return (
    <div className="mt-2 rounded-xl bg-gray-50 p-3">
      {!supported && <p className="text-xs text-amber-600">当前浏览器不支持语音识别,仅提供录音对比功能。</p>}

      {state.status !== 'result' && (
        <button
          onClick={handleClick}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"
        >
          {state.status === 'recording' ? (supported ? '录音识别中…' : '● 停止录音') : '🎙️ 跟读'}
        </button>
      )}

      {state.status === 'result' && (
        <div>
          {result && !isAzure && (
            <span className="mb-2 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
              基础模式 · 仅对/错,无分数
            </span>
          )}

          {result && isAzure && (
            <div className="mb-2 flex items-center gap-3 text-xs text-gray-600">
              <span className="text-base font-semibold text-gray-900">{Math.round(result.overall ?? 0)}</span>
              <span>准确 {Math.round(result.accuracy ?? 0)}</span>
              <span>流利 {Math.round(result.fluency ?? 0)}</span>
              <span>完整 {Math.round(result.completeness ?? 0)}</span>
            </div>
          )}

          {result ? (
            <p className="text-sm leading-relaxed">
              {result.words.map((w, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (!isAzure) return;
                    setExpandedWord(expandedWord === i ? null : i);
                    speak(w.word);
                  }}
                  className={`${wordClass(w)} ${isAzure ? 'cursor-pointer underline-offset-2 hover:underline' : 'cursor-default'}`}
                >
                  {w.word}{' '}
                </button>
              ))}
            </p>
          ) : (
            <p className="text-xs text-gray-400">未获得识别文本,可对比录音。</p>
          )}

          {isAzure && expandedWord !== null && result?.words[expandedWord] && (
            <div className="mt-2 rounded-lg bg-white p-2 text-xs text-gray-600">
              <span className="font-medium text-gray-900">{result.words[expandedWord].word}</span>
              {result.words[expandedWord].score !== null && (
                <span className="ml-2">{Math.round(result.words[expandedWord].score)} 分</span>
              )}
              {result.words[expandedWord].errorType !== 'none' && (
                <span className="ml-2 text-red-500">
                  {{ omission: '漏读', insertion: '多读', mispronunciation: '误读' }[
                    result.words[expandedWord].errorType as 'omission' | 'insertion' | 'mispronunciation'
                  ]}
                </span>
              )}
              {result.words[expandedWord].phonemes.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {result.words[expandedWord].phonemes.map((p, j) => (
                    <span
                      key={j}
                      className={`rounded px-1.5 py-0.5 font-mono ${
                        p.score >= 80 ? 'bg-green-50 text-green-700' : p.score >= 60 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {p.phoneme} {Math.round(p.score)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <button
              onClick={() => new Audio(state.recordingUrl).play()}
              className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs text-gray-700"
            >
              听我的
            </button>
            <button onClick={playOriginal} className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs text-gray-700">
              听原句
            </button>
            <button
              onClick={() => {
                setState({ status: 'idle' });
                setExpandedWord(null);
              }}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-400"
            >
              重试
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
