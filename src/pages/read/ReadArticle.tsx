import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as articlesLib from '../../lib/articles';
import * as vocab from '../../lib/vocab';
import * as progress from '../../lib/progress';
import { highlightVocabTerms } from '../../lib/highlight';
import SelectableText from '../../components/SelectableText';
import type { Article } from '../../types';

export default function ReadArticle() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null | undefined>(undefined);
  const [vocabTerms, setVocabTerms] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!id) return;
    setArticle(articlesLib.getArticleById(id));
    setVocabTerms(vocab.getAll().map((e) => e.term));
    setFinished(progress.getProgress().completedArticleIds.includes(id));
    let alive = true;
    articlesLib.loadAllArticles().then((all) => {
      if (alive) setArticle(all.find((a) => a.id === id) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const source = useMemo(() => (id ? { module: 'read' as const, materialId: id } : null), [id]);

  if (article === undefined) {
    return <div className="p-4 text-sm text-gray-400">加载中…</div>;
  }

  if (article === null || !source) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">未找到这篇文章。</p>
        <Link to="/read" className="mt-2 inline-block text-sm text-brand-600 underline">
          返回阅读列表
        </Link>
      </div>
    );
  }

  const handleFinish = () => {
    progress.markArticleDone(article.id);
    progress.markToday('read');
    setFinished(true);
  };

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">{article.title}</h1>
      <div className="mt-1 flex gap-2 text-xs text-gray-400">
        <span className="rounded-full bg-gray-100 px-2 py-0.5">{article.level}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5">{article.topic}</span>
      </div>

      <div className="mt-4 space-y-4">
        {article.paragraphs.map((p, i) => (
          <SelectableText
            key={i}
            as="p"
            context={p}
            source={source}
            className="text-lg leading-loose text-gray-800"
          >
            {highlightVocabTerms(p, vocabTerms)}
          </SelectableText>
        ))}
      </div>

      {article.sourceName && (
        <p className="mt-6 text-xs text-gray-400">
          来源:
          {article.sourceUrl ? (
            <a href={article.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              {article.sourceName}
            </a>
          ) : (
            article.sourceName
          )}
        </p>
      )}

      <button
        onClick={handleFinish}
        disabled={finished}
        className="mt-8 w-full rounded-xl bg-brand-600 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {finished ? '已完成 ✓' : '读完了'}
      </button>
    </div>
  );
}
