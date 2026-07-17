import { useEffect, useState } from 'react';
import * as vocab from '../../lib/vocab';
import * as progress from '../../lib/progress';
import * as planner from '../../lib/planner';
import * as ability from '../../lib/ability';
import * as wordbooks from '../../lib/wordbooks';
import { applyReview, endOfToday, type ReviewResult } from '../../lib/srs';
import { useSettings } from '../../context/SettingsContext';
import type { VocabEntry } from '../../types';
import ReviewCard from '../../components/vocab/ReviewCard';
import VocabList from './VocabList';

export default function VocabHome() {
  const { settings } = useSettings();
  const [queue, setQueue] = useState<VocabEntry[] | null>(null);
  const [stats, setStats] = useState({ dueCount: 0, newCount: 0, reviewedToday: 0 });
  const [sessionDone, setSessionDone] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      // 新卡額度用不完時,先從當前詞書補詞再組隊列
      try {
        await wordbooks.ensureDailyFeed(settings.dailyNewCards);
      } catch {
        // 詞書加載失敗不阻塞複習
      }
      if (!alive) return;
      const q = vocab.getReviewQueue(settings.dailyNewCards);
      setQueue(q.entries);
      setStats({ dueCount: q.dueCount, newCount: q.newCount, reviewedToday: q.reviewedToday });
      setDone(q.entries.length === 0);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 詞彙計時:僅在複習進行中計入
  useEffect(() => {
    if (done) return;
    return planner.trackModule('vocab');
  }, [done]);

  const handleAnswer = (result: ReviewResult) => {
    if (!queue || queue.length === 0) return;
    const [entry, ...rest] = queue;
    const updated = applyReview(entry, result);
    vocab.updateEntry(entry.id, { srs: updated.srs });
    vocab.logReview({
      entryId: entry.id,
      at: Date.now(),
      rating: result,
      fromState: entry.srs.state,
      toState: updated.srs.state,
    });
    setSessionDone((n) => n + 1);

    // 學習步驟未走完(Again / 新卡首個 Good)時 FSRS 給的 due 仍在今天,
    // 放回隊尾當日重現;排到未來日期的卡才離開隊列。
    const next = updated.srs.due <= endOfToday() ? [...rest, updated] : rest;

    if (next.length === 0) {
      progress.markToday('reviewCleared');
      planner.notifyVocabCleared();
      ability.noteVocabRetention();
      setDone(true);
    }
    setQueue(next);
  };

  if (queue === null) return null;

  if (!done) {
    const entry = queue[0];
    return (
      <div>
        <div className="flex gap-4 px-4 pt-4 text-sm text-gray-400">
          <span>
            到期 <span className="font-medium text-gray-600">{stats.dueCount}</span>
          </span>
          <span>
            已完成 <span className="font-medium text-gray-600">{stats.reviewedToday + sessionDone}</span>
          </span>
          <span>
            新卡 <span className="font-medium text-brand-600">{stats.newCount}</span>
          </span>
          <span className="ml-auto">剩余 {queue.length}</span>
        </div>
        <ReviewCard key={`${entry.id}-${entry.srs.reps}`} entry={entry} onAnswer={handleAnswer} />
      </div>
    );
  }

  const banner =
    stats.dueCount + stats.newCount === 0 ? '今日无复习 ✓' : `今日复习完成,共复习 ${sessionDone} 次 ✓`;
  return <VocabList banner={banner} />;
}
