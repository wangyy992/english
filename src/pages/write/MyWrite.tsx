import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import * as writing from '../../lib/writing';
import * as progress from '../../lib/progress';
import * as planner from '../../lib/planner';
import * as ability from '../../lib/ability';
import GradedAnswer from '../../components/write/GradedAnswer';
import UpgradesList from '../../components/write/UpgradesList';
import type { CustomWriteResult } from '../../types';

// 自命题写作:贴一段背景(如收到的英文邮件)或自定主题,写完 AI 评分并给出完整修改版。
export default function MyWrite() {
  const { hasApiKey } = useSettings();
  const [context, setContext] = useState('');
  const [draft, setDraft] = useState('');
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomWriteResult | null>(null);

  useEffect(() => planner.trackModule('write'), []);

  if (!hasApiKey) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-gray-900">自命题写作</h1>
        <p className="mt-4 text-sm text-gray-500">去设置页填入 DeepSeek API Key 以使用批改功能。</p>
      </div>
    );
  }

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  const submit = async () => {
    if (!draft.trim()) return;
    setGrading(true);
    setError(null);
    try {
      const r = await writing.gradeCustomWrite(context, draft);
      setResult(r);
      progress.markToday('write');
      planner.notifyWriteSubmitted();
      ability.noteWritingScore(r.score);
    } catch {
      setError('批改失败,请重试');
    } finally {
      setGrading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setDraft('');
  };

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">自命题写作</h1>
      <p className="mt-1 text-xs text-gray-400">
        贴一封收到的英文邮件 / 一个题目 / 一段情景(可留空),自己动笔写,AI 给你评分并改出完整修改版。
      </p>

      <label className="mt-4 block text-xs font-medium text-gray-500">背景 / 来信 / 要求(可选)</label>
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        disabled={Boolean(result)}
        placeholder="例:把收到的英文邮件粘贴到这里;或写下你想练的主题…"
        rows={5}
        className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm disabled:bg-gray-50"
      />

      <label className="mt-3 block text-xs font-medium text-gray-500">你的写作</label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={Boolean(result)}
        placeholder="在这里写你的回复 / 短文…"
        rows={10}
        className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm disabled:bg-gray-50"
      />
      <div className="mt-1 text-right text-xs text-gray-400">{wordCount} 词</div>

      {!result && (
        <button
          onClick={submit}
          disabled={grading || !draft.trim()}
          className="mt-2 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {grading ? '批改中…' : '提交批改'}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {result && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">得分</span>
            <span className="text-sm font-semibold text-brand-600">{result.score} / 5</span>
          </div>
          <p className="mt-2 text-sm text-gray-700">{result.comment}</p>

          <p className="mt-4 text-xs font-medium text-gray-400">你的原文(点红色处看批注)</p>
          <div className="mt-1">
            <GradedAnswer text={draft} errors={result.errors} />
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-400">修改后的完整版本</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{result.revised}</p>
          </div>

          <UpgradesList upgrades={result.upgrades} context={result.revised} materialId="mywrite" />

          <button onClick={reset} className="mt-4 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">
            再写一篇
          </button>
        </div>
      )}
    </div>
  );
}
