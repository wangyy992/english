import { useEffect, useRef, useState } from 'react';
import type { ReviewResult } from '../../lib/srs';
import { speak } from '../../lib/speech';
import { blankTerm } from '../../lib/text';
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
  const touchStartX = useRef<number | null>(null);

  useEffect(() => setFlipped(false), [entry.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (!flipped || Math.abs(dx) < SWIPE_THRESHOLD) return;
    onAnswer(dx > 0 ? 'known' : 'unknown');
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
            <p className="text-lg leading-relaxed text-gray-800">{blankTerm(entry.context, entry.term)}</p>
            {entry.phonetic && <p className="mt-3 text-sm text-gray-400">{entry.phonetic}</p>}
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
            <p className="mt-4 text-xs text-gray-300">点击卡片查看答案</p>
          </div>
        ) : (
          <div className="text-left">
            <h3 className="text-xl font-semibold text-gray-900">{entry.term}</h3>
            {entry.defEn && <p className="mt-2 text-sm text-gray-600">{entry.defEn}</p>}
            {entry.defZh && <p className="mt-1 text-sm text-gray-500">{entry.defZh}</p>}
            <p className="mt-3 text-sm leading-relaxed text-gray-700">{entry.context}</p>
            <SourceLink source={entry.source} />
          </div>
        )}
      </div>
      {flipped && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => onAnswer('unknown')}
            className="rounded-xl bg-red-50 py-3 text-sm font-medium text-red-600"
          >
            不认识
          </button>
          <button
            onClick={() => onAnswer('vague')}
            className="rounded-xl bg-yellow-50 py-3 text-sm font-medium text-yellow-700"
          >
            模糊
          </button>
          <button
            onClick={() => onAnswer('known')}
            className="rounded-xl bg-green-50 py-3 text-sm font-medium text-green-700"
          >
            认识
          </button>
        </div>
      )}
    </div>
  );
}
