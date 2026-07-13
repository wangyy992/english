import { useEffect, useState } from 'react';
import * as vocab from '../../lib/vocab';
import * as progress from '../../lib/progress';
import { applyReview, type ReviewResult } from '../../lib/srs';
import type { VocabEntry } from '../../types';
import ReviewCard from '../../components/vocab/ReviewCard';
import VocabList from './VocabList';

export default function VocabHome() {
  const [queue, setQueue] = useState<VocabEntry[] | null>(null);
  const [initialCount, setInitialCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const due = vocab.getDueEntries();
    setQueue(due);
    setInitialCount(due.length);
    setDone(due.length === 0);
  }, []);

  const handleAnswer = (result: ReviewResult) => {
    if (!queue) return;
    const entry = queue[index];
    const updated = applyReview(entry, result);
    vocab.updateEntry(entry.id, { srs: updated.srs });
    vocab.logReview({
      entryId: entry.id,
      at: Date.now(),
      result,
      fromStage: entry.srs.stage,
      toStage: updated.srs.stage,
    });

    if (index + 1 >= queue.length) {
      progress.markToday('reviewCleared');
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  };

  if (queue === null) return null;

  if (!done) {
    const entry = queue[index];
    return (
      <div>
        <div className="px-4 pt-4 text-sm text-gray-400">
          复习进度 {index + 1} / {queue.length}
        </div>
        <ReviewCard key={entry.id} entry={entry} onAnswer={handleAnswer} />
      </div>
    );
  }

  const banner = initialCount === 0 ? '今日无复习 ✓' : `今日复习完成,共复习 ${initialCount} 张 ✓`;
  return <VocabList banner={banner} />;
}
