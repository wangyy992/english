import { useEffect, useRef, useState } from 'react';
import { canAssess, startUnscripted, type UnscriptedResult, type UnscriptedSession } from '../../lib/speech';
import * as planner from '../../lib/planner';

/** 通用語音作答按鈕:點擊開始→點擊結束(或到 maxSeconds 自動結束)。 */
export default function VoiceInput({
  onResult,
  disabled,
  maxSeconds,
  label = '🎙️ 语音回答',
  locale = 'en-US',
}: {
  onResult: (result: UnscriptedResult) => void;
  disabled?: boolean;
  maxSeconds?: number;
  label?: string;
  locale?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const sessionRef = useRef<UnscriptedSession | null>(null);
  const supported = canAssess();

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (recording && maxSeconds && elapsed >= maxSeconds) void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, recording, maxSeconds]);

  // 卸載時丟棄未完成的會話
  useEffect(
    () => () => {
      sessionRef.current?.cancel();
      sessionRef.current = null;
    },
    [],
  );

  const start = async () => {
    try {
      sessionRef.current = await startUnscripted(locale);
      setElapsed(0);
      setRecording(true);
    } catch {
      // 麥克風拒絕等,保持 idle
    }
  };

  const stop = async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setRecording(false);
    if (!session) return;
    const result = await session.stop();
    planner.addSpeakRecording();
    onResult(result);
  };

  if (!supported) {
    return <p className="text-xs text-amber-600">当前浏览器不支持语音识别。</p>;
  }

  return (
    <button
      onClick={() => (recording ? void stop() : void start())}
      disabled={disabled}
      className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${
        recording ? 'bg-red-500' : 'bg-brand-600'
      }`}
    >
      {recording
        ? `■ 结束(${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')})`
        : label}
    </button>
  );
}
