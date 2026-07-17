import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import * as writing from '../../lib/writing';
import * as progress from '../../lib/progress';
import * as planner from '../../lib/planner';
import { DeepSeekKeyMissingError } from '../../lib/deepseek';
import GradedAnswer from '../../components/write/GradedAnswer';
import UpgradesList from '../../components/write/UpgradesList';
import type { TranslationItem, TranslationResult } from '../../types';

interface ItemState {
  answer: string;
  result?: TranslationResult;
  grading: boolean;
  error: string | null;
}

export default function Translate() {
  const { settings, hasApiKey } = useSettings();
  const [items, setItems] = useState<TranslationItem[]>([]);
  const [states, setStates] = useState<ItemState[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const load = async (regenerate = false) => {
    setLoading(true);
    setLoadError(false);
    try {
      const set = regenerate
        ? await writing.regenerateTranslationSet(settings.level, settings.interests)
        : await writing.ensureTranslationSet(settings.level, settings.interests);
      const cache = writing.getCache();
      setItems(set);
      setGeneratedAt(cache.generatedAt);
      setStates(
        set.map((_, i) => ({
          answer: cache.answers[i]?.answer ?? '',
          result: cache.answers[i]?.result,
          grading: false,
          error: null,
        })),
      );
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasApiKey) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApiKey]);

  useEffect(() => planner.trackModule('write'), []);

  const allDone = states.length > 0 && states.every((s) => s.result);

  // 「寫」的完成條件:5 句全部提交批改
  useEffect(() => {
    if (allDone) planner.notifyWriteSubmitted();
  }, [allDone]);

  if (!hasApiKey) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-gray-900">翻译练习</h1>
        <p className="mt-4 text-sm text-gray-500">去设置页填入 DeepSeek API Key 以使用翻译批改功能。</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-400">生成题目中…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-500">题目生成失败,请重试。</p>
        <button onClick={() => load(true)} className="mt-3 rounded-xl bg-brand-600 px-4 py-2 text-sm text-white">
          重试
        </button>
      </div>
    );
  }

  const setAnswer = (index: number, answer: string) => {
    setStates((prev) => prev.map((s, i) => (i === index ? { ...s, answer } : s)));
  };

  const submit = async (index: number) => {
    const item = items[index];
    const answer = states[index].answer.trim();
    if (!answer) return;
    setStates((prev) => prev.map((s, i) => (i === index ? { ...s, grading: true, error: null } : s)));
    try {
      const result = await writing.gradeTranslation(item.zh, answer);
      writing.saveTranslationAnswer(index, answer, result);
      setStates((prev) => prev.map((s, i) => (i === index ? { ...s, grading: false, result } : s)));
      progress.markToday('write');
    } catch (err) {
      const message = err instanceof DeepSeekKeyMissingError ? '请先在设置页填入 API Key' : '批改失败,请重试';
      setStates((prev) => prev.map((s, i) => (i === index ? { ...s, grading: false, error: message } : s)));
    }
  };


  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">翻译练习</h1>
        <button onClick={() => load(true)} className="text-sm font-medium text-brand-600">
          换一批
        </button>
      </div>

      {allDone && (
        <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          5 句已全部完成,可以「换一批」继续练习。
        </div>
      )}

      <div className="mt-4 space-y-4">
        {items.map((item, i) => {
          const state = states[i];
          return (
            <div key={`${generatedAt}-${i}`} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-base text-gray-900">{item.zh}</p>
              <textarea
                value={state.answer}
                onChange={(e) => setAnswer(i, e.target.value)}
                disabled={Boolean(state.result)}
                placeholder="输入你的英文翻译…"
                rows={2}
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 p-2.5 text-sm disabled:bg-gray-50"
              />
              {!state.result && (
                <button
                  onClick={() => submit(i)}
                  disabled={state.grading || !state.answer.trim()}
                  className="mt-2 rounded-xl bg-brand-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {state.grading ? '批改中…' : '提交'}
                </button>
              )}
              {state.error && <p className="mt-2 text-xs text-red-500">{state.error}</p>}

              {state.result && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">得分</span>
                    <span className="text-sm font-semibold text-brand-600">{state.result.score} / 5</span>
                  </div>
                  <div className="mt-2">
                    <GradedAnswer text={state.answer} errors={state.result.errors} />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    更地道的说法:<span className="text-gray-600">{state.result.better_version}</span>
                  </p>
                  <UpgradesList
                    upgrades={state.result.upgrades}
                    context={state.result.better_version}
                    materialId={`translate:${generatedAt}:${i}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
