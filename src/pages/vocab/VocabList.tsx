import { useEffect, useState } from 'react';
import * as vocab from '../../lib/vocab';
import type { VocabEntry } from '../../types';

type FilterModule = 'all' | VocabEntry['source']['module'];

const FILTER_LABEL: Record<FilterModule, string> = {
  all: '全部',
  listen: '听力',
  read: '阅读',
  write: '写作',
};

function stageLabel(srs: VocabEntry['srs']): string {
  switch (srs.state) {
    case 'new':
      return '新卡';
    case 'learning':
    case 'relearning':
      return '学习中';
    case 'review':
      return `间隔 ${Math.max(1, Math.round(srs.scheduledDays))} 天`;
  }
}

export default function VocabList({ banner }: { banner?: string }) {
  const [entries, setEntries] = useState<VocabEntry[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterModule>('all');

  useEffect(() => {
    setEntries(vocab.getAll());
  }, []);

  const filtered = entries.filter((e) => {
    if (filter !== 'all' && e.source.module !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      e.term.toLowerCase().includes(q) ||
      (e.defZh ?? '').toLowerCase().includes(q) ||
      e.context.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4">
      {banner && <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{banner}</div>}
      <h1 className="text-xl font-semibold text-gray-900">生词本</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索单词 / 释义 / 例句"
        className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />

      <div className="mt-3 flex gap-2">
        {(Object.keys(FILTER_LABEL) as FilterModule[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2 pb-4">
        {filtered.length === 0 && <p className="text-sm text-gray-400">暂无生词</p>}
        {filtered.map((e) => (
          <div key={e.id} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-gray-900">{e.term}</span>
              <span className="shrink-0 text-xs text-gray-400">{stageLabel(e.srs)}</span>
            </div>
            {e.defZh && <p className="mt-1 text-sm text-gray-500">{e.defZh}</p>}
            <p className="mt-1 line-clamp-2 text-xs text-gray-400">{e.context}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
