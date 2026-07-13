import { useRef, useState } from 'react';
import { canRecognizeSpeech, Recorder, recognizeOnce } from '../../lib/speech';
import { diffAgainstOriginal, type DiffToken } from '../../lib/diff';

type ShadowState =
  | { status: 'idle' }
  | { status: 'recording' }
  | { status: 'result'; diff: DiffToken[] | null; recordingUrl: string };

export default function ShadowControls({
  sentenceText,
  playOriginal,
}: {
  sentenceText: string;
  playOriginal: () => void;
}) {
  const [state, setState] = useState<ShadowState>({ status: 'idle' });
  const supported = canRecognizeSpeech();
  const manualRecorderRef = useRef<Recorder | null>(null);

  const startWithRecognition = async () => {
    const recorder = new Recorder();
    try {
      await recorder.start();
    } catch {
      return; // mic permission denied
    }
    setState({ status: 'recording' });
    try {
      const transcript = await recognizeOnce();
      const blob = await recorder.stop();
      setState({
        status: 'result',
        diff: diffAgainstOriginal(sentenceText, transcript),
        recordingUrl: URL.createObjectURL(blob),
      });
    } catch {
      const blob = await recorder.stop();
      setState({ status: 'result', diff: null, recordingUrl: URL.createObjectURL(blob) });
    }
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
      setState({ status: 'result', diff: null, recordingUrl: URL.createObjectURL(blob ?? new Blob()) });
    }
  };

  const handleClick = () => {
    if (supported) startWithRecognition();
    else toggleManualRecording();
  };

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
          {state.diff ? (
            <p className="text-sm leading-relaxed">
              {state.diff.map((tok, i) => (
                <span key={i} className={tok.matched ? 'text-green-600' : 'text-red-500'}>
                  {tok.text}{' '}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-xs text-gray-400">未获得识别文本,可对比录音。</p>
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
              onClick={() => setState({ status: 'idle' })}
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
