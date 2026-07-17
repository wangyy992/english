import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { chatJSON } from '../../lib/deepseek';
import {
  buildDialogueSummaryPrompt,
  buildDialogueSystemPrompt,
  DIALOGUE_SUMMARY_SYSTEM,
} from '../../lib/prompts/dialogue';
import { speak, type UnscriptedResult } from '../../lib/speech';
import * as planner from '../../lib/planner';
import * as ability from '../../lib/ability';
import VoiceInput from '../../components/speak/VoiceInput';

const SCENARIOS = ['点餐', '面试', '机场'];
const MAX_TURNS = 10;

interface Turn {
  role: 'ai' | 'user';
  text: string;
  /** 用戶輪:AI 給出的更地道說法 */
  better?: string;
}

interface AiPayload {
  reply: string;
  better_version: string;
}

interface Summary {
  score: number;
  feedback: string;
}

export default function SpeakDialogue() {
  const { hasApiKey } = useSettings();
  const [scenario, setScenario] = useState<string | null>(null);
  const [customDraft, setCustomDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  const pronScores = useRef<number[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => planner.trackModule('speak'), []);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [turns, summary]);

  const userTurnCount = turns.filter((t) => t.role === 'user').length;

  const callAi = async (currentScenario: string, history: Turn[]): Promise<AiPayload> => {
    const payload = await chatJSON<AiPayload>(
      buildDialogueSystemPrompt(currentScenario),
      JSON.stringify({
        history: history.map((t) => ({ speaker: t.role === 'ai' ? 'you' : 'student', text: t.text })),
      }),
    );
    if (!payload || typeof payload.reply !== 'string') throw new Error('bad dialogue payload');
    return payload;
  };

  const start = async (s: string) => {
    setScenario(s);
    setBusy(true);
    setError(false);
    try {
      const payload = await callAi(s, []);
      setTurns([{ role: 'ai', text: payload.reply }]);
      speak(payload.reply);
    } catch {
      setError(true);
      setScenario(null);
    } finally {
      setBusy(false);
    }
  };

  const finish = async (allTurns: Turn[]) => {
    if (!scenario) return;
    setBusy(true);
    try {
      const userTexts = allTurns.filter((t) => t.role === 'user').map((t) => t.text);
      const result = await chatJSON<Summary>(
        DIALOGUE_SUMMARY_SYSTEM,
        buildDialogueSummaryPrompt(scenario, userTexts),
        { temperature: 0.3 },
      );
      if (result && typeof result.score === 'number' && typeof result.feedback === 'string') {
        setSummary(result);
        const pron = pronScores.current;
        ability.noteSpeakingActivity(
          (Math.max(1, Math.min(5, result.score)) / 5) * 100,
          pron.length > 0 ? pron.reduce((a, b) => a + b, 0) / pron.length : null,
        );
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const handleVoice = async (result: UnscriptedResult) => {
    if (!scenario || !result.transcript || busy) return;
    if (result.overall !== null) pronScores.current.push(result.overall);
    const withUser: Turn[] = [...turns, { role: 'user', text: result.transcript }];
    setTurns(withUser);
    setBusy(true);
    setError(false);
    try {
      const payload = await callAi(scenario, withUser);
      const annotated = withUser.map((t, i) =>
        i === withUser.length - 1 && payload.better_version ? { ...t, better: payload.better_version } : t,
      );
      const next: Turn[] = [...annotated, { role: 'ai', text: payload.reply }];
      setTurns(next);
      speak(payload.reply);
      if (next.filter((t) => t.role === 'user').length >= MAX_TURNS) await finish(next);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (!hasApiKey) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-gray-900">情景对话</h1>
        <p className="mt-4 text-sm text-gray-500">去设置页填入 DeepSeek API Key 以使用情景对话。</p>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="p-4 pb-8">
        <h1 className="text-xl font-semibold text-gray-900">情景对话</h1>
        <p className="mt-1 text-xs text-gray-400">选一个场景开始,AI 扮演对方,你用语音回答。</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => start(s)}
              disabled={busy}
              className="rounded-xl bg-white py-3 text-sm font-medium text-gray-700 shadow-sm disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            placeholder="自定义场景,如 酒店退房"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            onClick={() => customDraft.trim() && start(customDraft.trim())}
            disabled={busy || !customDraft.trim()}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            开始
          </button>
        </div>
        {busy && <p className="mt-4 text-sm text-gray-400">开场中…</p>}
        {error && <p className="mt-4 text-sm text-red-500">开场失败,请重试。</p>}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{scenario}</h1>
        <span className="text-xs text-gray-400">
          {userTurnCount}/{MAX_TURNS} 轮
        </span>
      </div>

      <div className="mt-4 flex-1 space-y-3">
        {turns.map((t, i) => (
          <div key={i} className={t.role === 'ai' ? 'flex' : 'flex justify-end'}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                t.role === 'ai' ? 'bg-white text-gray-800 shadow-sm' : 'bg-brand-600 text-white'
              }`}
            >
              {t.role === 'ai' ? (
                <button onClick={() => speak(t.text)} className="text-left">
                  {t.text} <span className="text-xs text-gray-300">🔊</span>
                </button>
              ) : (
                <>
                  {t.text}
                  {t.better && (
                    <details className="mt-1 text-xs text-brand-100">
                      <summary className="cursor-pointer">更地道的说法</summary>
                      <p className="mt-1">{t.better}</p>
                    </details>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {busy && !summary && <p className="text-xs text-gray-400">对方输入中…</p>}
        {error && <p className="text-xs text-red-500">这一轮失败了,可再说一次。</p>}

        {summary && (
          <div className="rounded-xl bg-brand-50 p-3">
            <p className="text-sm font-medium text-brand-700">对话总结 · 内容 {summary.score}/5</p>
            <p className="mt-1 text-sm text-brand-700">{summary.feedback}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!summary && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <VoiceInput onResult={(r) => void handleVoice(r)} disabled={busy} />
          {userTurnCount > 0 && (
            <button
              onClick={() => void finish(turns)}
              disabled={busy}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-500 disabled:opacity-50"
            >
              结束并总结
            </button>
          )}
        </div>
      )}
    </div>
  );
}
