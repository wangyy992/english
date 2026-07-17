import { useEffect, useRef, useState } from 'react';
import type { ReviewResult } from '../../lib/srs';
import { speak } from '../../lib/speech';
import { blankTerm } from '../../lib/text';
import { lookupWord } from '../../lib/dictionary';
import { chatJSON, hasApiKey } from '../../lib/deepseek';
import * as vocab from '../../lib/vocab';
import type { VocabEntry } from '../../types';
import SourceLink from './SourceLink';

const SWIPE_THRESHOLD = 60;

export default function ReviewCard({
  entry,
  onAnswer,
}: {
  entry: VocabEntry;
  onAnswer: (result: ReviewResult) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [lazyDef, setLazyDef] = useState<{ phonetic?: string; defEn?: string; defZh?: string } | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setFlipped(false);
    setLazyDef(null);
  }, [entry.id]);

  // 詞書卡建卡時不帶釋義:翻面時懶加載詞典(免費)+ 中文釋義(有 Key 時),
  // 並回寫入生詞本,之後不再請求。
  useEffect(() => {
    if (!flipped || entry.defEn || lazyDef) return;
    let alive = true;
    (async () => {
      const dict = await lookupWord(entry.term);
      const patch: { phonetic?: string; defEn?: string; defZh?: string } = {
        phonetic: entry.phonetic ?? dict?.phonetic,
        defEn: dict?.meanings.map((m) => `${m.partOfSpeech}. ${m.definition}`).join(';') || undefined,
      };
      if (!entry.defZh && hasApiKey()) {
        try {
          const zh = await chatJSON<{ defZh: string }>(
            '你是英语教学助手。只输出严格的 JSON,不要任何多余文字或 Markdown 围栏。',
            `给出单词 "${entry.term}" 的简明中文释义(含词性),输出 JSON {"defZh": "..."}`,
            { temperature: 0.3 },
          );
          if (zh?.defZh) patch.defZh = zh.defZh;
        } catch {
          // 中文釋義失敗不阻塞
        }
      }
      if (!alive) return;
      setLazyDef(patch);
      vocab.updateEntry(entry.id, patch);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, entry.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (!flipped || Math.abs(dx) < SWIPE_THRESHOLD) return;
    onAnswer(dx > 0 ? 'good' : 'again');
  };

  return (
    <div className="p-4">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-[280px] flex-col justify-center rounded-3xl bg-white p-6 text-center shadow-sm"
      >
        {!flipped ? (
          <div>
            {entry.context ? (
              <p className="text-lg leading-relaxed text-gray-800">{blankTerm(entry.context, entry.term)}</p>
            ) : (
              <p className="font-display text-3xl text-gray-900">{entry.term}</p>
            )}
            {(entry.phonetic ?? lazyDef?.phonetic) && (
              <p className="mt-3 text-sm text-gray-400">{entry.phonetic ?? lazyDef?.phonetic}</p>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(entry.term);
              }}
              aria-label="发音"
              className="mt-2 text-xl"
            >
              🔊
            </button>
            <p className="mt-4 text-xs text-gray-300">
              {entry.context ? '点击卡片查看答案' : '回忆词义,点击卡片查看答案'}
            </p>
          </div>
        ) : (
          <div className="text-left">
            <h3 className="text-xl font-semibold text-gray-900">{entry.term}</h3>
            {(entry.phonetic ?? lazyDef?.phonetic) && (
              <p className="mt-0.5 text-sm text-gray-400">{entry.phonetic ?? lazyDef?.phonetic}</p>
            )}
            {!entry.defEn && !lazyDef && <p className="mt-2 text-sm text-gray-400">释义加载中…</p>}
            {(entry.defEn ?? lazyDef?.defEn) && (
              <p className="mt-2 text-sm text-gray-600">{entry.defEn ?? lazyDef?.defEn}</p>
            )}
            {(entry.defZh ?? lazyDef?.defZh) && (
              <p className="mt-1 text-sm text-gray-500">{entry.defZh ?? lazyDef?.defZh}</p>
            )}
            {entry.context && <p className="mt-3 text-sm leading-relaxed text-gray-700">{entry.context}</p>}
            <SourceLink source={entry.source} />
          </div>
        )}
      </div>
      {flipped && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          <button
            onClick={() => onAnswer('again')}
            className="rounded-xl bg-red-50 py-3 text-sm font-medium text-red-600"
          >
            重来
          </button>
          <button
            onClick={() => onAnswer('hard')}
            className="rounded-xl bg-yellow-50 py-3 text-sm font-medium text-yellow-700"
          >
            困难
          </button>
          <button
            onClick={() => onAnswer('good')}
            className="rounded-xl bg-green-50 py-3 text-sm font-medium text-green-700"
          >
            良好
          </button>
          <button
            onClick={() => onAnswer('easy')}
            className="rounded-xl bg-blue-50 py-3 text-sm font-medium text-blue-600"
          >
            简单
          </button>
        </div>
      )}
    </div>
  );
}
