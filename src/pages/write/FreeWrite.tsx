import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import * as writing from '../../lib/writing';
import * as progress from '../../lib/progress';
import GradedAnswer from '../../components/write/GradedAnswer';
import UpgradesList from '../../components/write/UpgradesList';
import type { FreeWriteResult, FreeWriteTopic } from '../../types';

const TARGET_WORDS = 120;
const SOFT_LIMIT_SECONDS = 15 * 60;

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function FreeWrite() {
  const { settings, hasApiKey } = useSettings();
  const [topics, setTopics] = useState<FreeWriteTopic[] | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [topicError, setTopicError] = useState(false);
  const [selected, setSelected] = useState<FreeWriteTopic | null>(null);
  const [essay, setEssay] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [result, setResult] = useState<FreeWriteResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTopics = async (regenerate = false) => {
    setLoadingTopics(true);
    setTopicError(false);
    try {
      const cache = writing.getCache();
      const list =
        !regenerate && cache.freeWriteTopics && cache.freeWriteTopics.length > 0
          ? cache.freeWriteTopics
          : await writing.generateFreeWriteTopics(settings.interests);
      setTopics(list);
    } catch {
      setTopicError(true);
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => {
    if (hasApiKey) loadTopics();
    else setLoadingTopics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApiKey]);

  useEffect(() => {
    if (!selected) return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selected]);

  if (!hasApiKey) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-gray-900">自由写作</h1>
        <p className="mt-4 text-sm text-gray-500">去设置页填入 DeepSeek API Key 以使用自由写作功能。</p>
      </div>
    );
  }

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  const handleSubmit = async () => {
    if (!selected || !essay.trim()) return;
    setGrading(true);
    setGradeError(null);
    try {
      const r = await writing.gradeFreeWrite(selected.topic, essay);
      setResult(r);
      progress.markToday('write');
    } catch {
      setGradeError('批改失败,请重试');
    } finally {
      setGrading(false);
    }
  };

  const handleRestart = () => {
    setSelected(null);
    setEssay('');
    setElapsed(0);
    setResult(null);
    setGradeError(null);
  };

  if (!selected) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">自由写作</h1>
          <button onClick={() => loadTopics(true)} className="text-sm font-medium text-brand-600">
            换一批
          </button>
        </div>
        {loadingTopics && <p className="mt-4 text-sm text-gray-400">生成主题中…</p>}
        {topicError && <p className="mt-4 text-sm text-red-500">主题生成失败,请重试。</p>}
        {topics && (
          <div className="mt-4 space-y-3">
            {topics.map((t, i) => (
              <button
                key={i}
                onClick={() => setSelected(t)}
                className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm"
              >
                <h2 className="font-medium text-gray-900">{t.topic}</h2>
                <ul className="mt-2 space-y-0.5 text-xs text-gray-400">
                  {t.questions.map((q, qi) => (
                    <li key={qi}>· {q}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 pb-8">
      <button onClick={handleRestart} className="text-sm text-gray-400">
        ← 换个主题
      </button>
      <h1 className="mt-2 text-lg font-semibold text-gray-900">{selected.topic}</h1>
      <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
        {selected.questions.map((q, i) => (
          <li key={i}>· {q}</li>
        ))}
      </ul>

      <textarea
        value={essay}
        onChange={(e) => setEssay(e.target.value)}
        disabled={Boolean(result)}
        placeholder="开始写作…"
        rows={10}
        className="mt-4 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm disabled:bg-gray-50"
      />

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={elapsed >= SOFT_LIMIT_SECONDS ? 'font-medium text-amber-600' : 'text-gray-400'}>
          用时 {formatClock(elapsed)}
        </span>
        <span className="text-gray-400">
          {wordCount} / {TARGET_WORDS} 词
        </span>
      </div>

      {!result && (
        <button
          onClick={handleSubmit}
          disabled={grading || !essay.trim()}
          className="mt-3 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {grading ? '批改中…' : '提交批改'}
        </button>
      )}
      {gradeError && <p className="mt-2 text-xs text-red-500">{gradeError}</p>}

      {result && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">得分</span>
            <span className="text-sm font-semibold text-brand-600">{result.score} / 5</span>
          </div>
          <div className="mt-2">
            <GradedAnswer text={essay} errors={result.errors} />
          </div>
          <p className="mt-3 text-xs text-gray-400">
            结构建议:<span className="text-gray-600">{result.structure_feedback}</span>
          </p>
          <div className="mt-3 rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-400">示范重写(最弱的一段)</p>
            <p className="mt-1 text-sm text-gray-700">{result.rewritten_paragraph}</p>
          </div>
          <UpgradesList upgrades={result.upgrades} context={result.better_version} materialId={`freewrite:${selected.topic}`} />
        </div>
      )}
    </div>
  );
}
