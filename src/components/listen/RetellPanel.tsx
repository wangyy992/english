import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { canAssess, Recorder, startUnscripted, type UnscriptedResult, type UnscriptedSession } from '../../lib/speech';
import { gradeRetelling, type RetellResult } from '../../lib/retell';
import * as planner from '../../lib/planner';

const MIN_SECONDS = 60;
const MAX_SECONDS = 120;

type PanelState =
  | { status: 'idle' }
  | { status: 'recording'; elapsed: number }
  | { status: 'grading'; speech: UnscriptedResult; recordingUrl: string }
  | { status: 'result'; speech: UnscriptedResult; recordingUrl: string; grade: RetellResult | null; gradeError: boolean };

export default function RetellPanel({ originalText }: { originalText: string }) {
  const { hasApiKey } = useSettings();
  const [state, setState] = useState<PanelState>({ status: 'idle' });
  const sessionRef = useRef<UnscriptedSession | null>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const supported = canAssess();

  // 錄音計時 + 到 120 秒自動停止
  useEffect(() => {
    if (state.status !== 'recording') return;
    const id = window.setInterval(() => {
      setState((s) => (s.status === 'recording' ? { ...s, elapsed: s.elapsed + 1 } : s));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status === 'recording' && state.elapsed >= MAX_SECONDS) void stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const startRecording = async () => {
    const recorder = new Recorder();
    try {
      await recorder.start();
    } catch {
      return; // mic denied
    }
    recorderRef.current = recorder;
    try {
      sessionRef.current = await startUnscripted();
    } catch {
      await recorder.stop();
      return;
    }
    setState({ status: 'recording', elapsed: 0 });
  };

  const stopRecording = async () => {
    const session = sessionRef.current;
    const recorder = recorderRef.current;
    sessionRef.current = null;
    recorderRef.current = null;
    if (!session || !recorder) return;

    const [speech, blob] = await Promise.all([session.stop(), recorder.stop()]);
    planner.addSpeakRecording();
    const recordingUrl = URL.createObjectURL(blob);

    if (!speech.transcript || !hasApiKey) {
      setState({ status: 'result', speech, recordingUrl, grade: null, gradeError: false });
      return;
    }
    setState({ status: 'grading', speech, recordingUrl });
    try {
      const grade = await gradeRetelling(originalText, speech.transcript);
      setState({ status: 'result', speech, recordingUrl, grade, gradeError: false });
    } catch {
      setState({ status: 'result', speech, recordingUrl, grade: null, gradeError: true });
    }
  };

  if (!supported) {
    return <p className="mt-6 px-4 text-center text-sm text-amber-600">当前浏览器不支持语音识别,无法进行复述练习。</p>;
  }

  return (
    <div className="mt-4 px-4">
      <p className="text-center text-sm text-gray-400">文本已隐藏。用自己的话复述这段材料,60–120 秒。</p>

      {state.status === 'idle' && (
        <button
          onClick={startRecording}
          className="mx-auto mt-6 block rounded-2xl bg-brand-600 px-8 py-3 text-sm font-medium text-white"
        >
          🎙️ 开始复述
        </button>
      )}

      {state.status === 'recording' && (
        <div className="mt-6 text-center">
          <p className="text-2xl font-semibold tabular-nums text-gray-900">
            {Math.floor(state.elapsed / 60)}:{String(state.elapsed % 60).padStart(2, '0')}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {state.elapsed < MIN_SECONDS ? `再讲 ${MIN_SECONDS - state.elapsed} 秒更充分` : '可以结束了'}
            (上限 2 分钟)
          </p>
          <button
            onClick={() => void stopRecording()}
            className="mt-4 rounded-2xl bg-red-500 px-8 py-3 text-sm font-medium text-white"
          >
            ■ 结束复述
          </button>
        </div>
      )}

      {state.status === 'grading' && <p className="mt-6 text-center text-sm text-gray-400">批改中…</p>}

      {(state.status === 'result' || state.status === 'grading') && (
        <div className="mt-4 space-y-3">
          {state.speech.transcript ? (
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs text-gray-400">你的复述(转写)</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{state.speech.transcript}</p>
            </div>
          ) : (
            <p className="text-center text-xs text-gray-400">未识别到语音,可重试。</p>
          )}

          {state.status === 'result' && (
            <>
              {(state.grade || state.speech.overall !== null) && (
                <div className="flex gap-3">
                  {state.grade && (
                    <div className="flex-1 rounded-xl bg-white p-3 text-center shadow-sm">
                      <p className="text-xs text-gray-400">内容覆盖度</p>
                      <p className="mt-1 text-xl font-semibold text-gray-900">{state.grade.coverage}/5</p>
                    </div>
                  )}
                  {state.speech.overall !== null && (
                    <div className="flex-1 rounded-xl bg-white p-3 text-center shadow-sm">
                      <p className="text-xs text-gray-400">发音(Azure)</p>
                      <p className="mt-1 text-xl font-semibold text-gray-900">{Math.round(state.speech.overall)}</p>
                      {state.speech.fluency !== null && (
                        <p className="text-xs text-gray-400">流利 {Math.round(state.speech.fluency)}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {state.grade && (
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="text-sm text-gray-800">{state.grade.summary}</p>
                  {state.grade.grammar_issues.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs font-medium text-gray-500">语法问题</p>
                      {state.grade.grammar_issues.map((g, i) => (
                        <p key={i} className="text-xs leading-relaxed">
                          <span className="text-red-500 line-through">{g.original}</span>{' '}
                          <span className="text-green-600">{g.fixed}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {state.grade.upgrades.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs font-medium text-gray-500">用词升级</p>
                      {state.grade.upgrades.map((u, i) => (
                        <p key={i} className="text-xs leading-relaxed text-gray-600">
                          <span className="font-medium text-gray-800">{u.phrase}</span> → {u.note}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {state.gradeError && <p className="text-center text-xs text-red-500">批改失败,稍后再试(转写已保留)。</p>}
              {!hasApiKey && state.speech.transcript && (
                <p className="text-center text-xs text-gray-400">填入 DeepSeek API Key 后可获得内容批改。</p>
              )}

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => new Audio(state.recordingUrl).play()}
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs text-gray-700"
                >
                  听我的录音
                </button>
                <button
                  onClick={() => setState({ status: 'idle' })}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-400"
                >
                  再来一次
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
