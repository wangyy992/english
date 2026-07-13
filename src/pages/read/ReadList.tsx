import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as articlesLib from '../../lib/articles';
import * as progress from '../../lib/progress';
import { useSettings } from '../../context/SettingsContext';
import type { Article } from '../../types';

export default function ReadList() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [pasted, setPasted] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    setArticles(articlesLib.getAllArticles());
    setCompletedIds(progress.getProgress().completedArticleIds);
  }, []);

  const handlePasteSubmit = () => {
    const text = pasted.trim();
    if (!text) return;
    const { title, paragraphs } = articlesLib.parsePastedText(text);
    const article = articlesLib.addMyArticle({ title, paragraphs, level: settings.level });
    navigate(`/read/${article.id}`);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-gray-900">阅读</h1>

      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">粘贴一篇文章</h2>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="粘贴任意英文文章…"
          rows={5}
          className="mt-2 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm"
        />
        <button
          onClick={handlePasteSubmit}
          disabled={!pasted.trim()}
          className="mt-2 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          开始阅读
        </button>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900">文章库</h2>
        <div className="mt-2 space-y-2">
          {articles.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(`/read/${a.id}`)}
              className="block w-full rounded-xl bg-white p-3 text-left shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900">{a.title}</span>
                {completedIds.includes(a.id) && <span className="shrink-0 text-green-600">✓</span>}
              </div>
              <div className="mt-1 flex gap-2 text-xs text-gray-400">
                <span className="rounded-full bg-gray-100 px-2 py-0.5">{a.level}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5">{a.topic}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
