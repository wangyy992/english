import { useEffect, useState } from 'react';
import * as wordbooks from '../../lib/wordbooks';
import type { WordbookMeta } from '../../lib/wordbooks';

/** 內置詞書選擇:選中後每日新卡額度用不完時自動補詞。 */
export default function WordbookPicker() {
  const [books, setBooks] = useState<WordbookMeta[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(wordbooks.getActiveId());
  const [error, setError] = useState(false);

  useEffect(() => {
    wordbooks
      .loadIndex()
      .then(setBooks)
      .catch(() => setError(true));
  }, []);

  const toggle = (id: string) => {
    const next = activeId === id ? null : id;
    wordbooks.setActive(next);
    setActiveId(next);
    // 啟用詞書後刷新,讓複習隊列立即從詞書補入新卡(避免同路由不重掛載)
    if (next) window.location.reload();
  };

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-card">
      <h2 className="text-sm font-semibold text-gray-900">词书</h2>
      <p className="mt-1 text-xs text-gray-500">
        选一本后,每天复习的新卡额度用不完时自动从词书补词;没时间做听力阅读也能背几个单词。
      </p>
      {error && <p className="mt-3 text-sm text-red-500">词书加载失败,请刷新重试。</p>}
      {!books && !error && <p className="mt-3 text-sm text-gray-400">加载中…</p>}
      {books && (
        <div className="mt-3 space-y-2">
          {books.map((b) => {
            const active = activeId === b.id;
            const learned = Math.min(wordbooks.getCursor(b.id), b.count);
            return (
              <button
                key={b.id}
                onClick={() => toggle(b.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                  active ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white'
                }`}
              >
                <span>
                  <span className={`block text-sm font-medium ${active ? 'text-brand-700' : 'text-gray-800'}`}>
                    {b.name}
                    {active && ' ✓'}
                  </span>
                  <span className="block text-xs text-gray-400">
                    {b.desc} · 已学 {learned}/{b.count}
                  </span>
                </span>
                <span className={`text-xs ${active ? 'text-brand-600' : 'text-gray-300'}`}>
                  {active ? '使用中' : '启用'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
