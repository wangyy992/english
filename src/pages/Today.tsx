import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { getAllLessons, loadAllLessons } from '../lib/lessons';
import * as articlesLib from '../lib/articles';
import * as vocab from '../lib/vocab';
import * as writingLib from '../lib/writing';
import * as progress from '../lib/progress';
import TaskCard from '../components/today/TaskCard';
import type { AudioLesson, Article, CEFRLevel, DailyLog } from '../types';

const CEFR_TO_LESSON_LEVEL: Record<CEFRLevel, 1 | 2 | 3> = { A2: 1, B1: 2, B2: 2, C1: 3 };

function pickLesson(lessons: AudioLesson[], completedIds: string[], level: CEFRLevel): AudioLesson | undefined {
  const preferred = CEFR_TO_LESSON_LEVEL[level];
  const pool = lessons.filter((l) => !completedIds.includes(l.id));
  const candidates = pool.length > 0 ? pool : lessons;
  return candidates.find((l) => l.level === preferred) ?? candidates[0];
}

function pickArticle(articles: Article[], completedIds: string[], level: CEFRLevel): Article | undefined {
  const pool = articles.filter((a) => !completedIds.includes(a.id));
  const candidates = pool.length > 0 ? pool : articles;
  return candidates.find((a) => a.level === level) ?? candidates[0];
}

type WriteState = 'loading' | 'ready' | 'no-key' | 'error';

export default function Today() {
  const navigate = useNavigate();
  const { settings, hasApiKey } = useSettings();
  const [streak, setStreak] = useState(0);
  const [todayLog, setTodayLog] = useState<DailyLog>({ date: '' });
  const [lesson, setLesson] = useState<AudioLesson | undefined>();
  const [article, setArticle] = useState<Article | undefined>();
  const [dueCount, setDueCount] = useState(0);
  const [writeState, setWriteState] = useState<WriteState>('loading');

  useEffect(() => {
    const p = progress.getProgress();
    setStreak(p.streak);
    setTodayLog(progress.getTodayLog());
    setLesson(pickLesson(getAllLessons(), p.completedLessonIds, settings.level));
    setArticle(pickArticle(articlesLib.getAllArticles(), p.completedArticleIds, settings.level));
    setDueCount(vocab.getDueEntries().length);
    let alive = true;
    loadAllLessons().then((all) => {
      if (alive) setLesson(pickLesson(all, p.completedLessonIds, settings.level));
    });
    return () => {
      alive = false;
    };
  }, [settings.level]);

  useEffect(() => {
    const cache = writingLib.getCache();
    if (cache.translationSet.length > 0) {
      setWriteState('ready');
      return;
    }
    if (!hasApiKey) {
      setWriteState('no-key');
      return;
    }
    setWriteState('loading');
    writingLib
      .ensureTranslationSet(settings.level, settings.interests)
      .then(() => setWriteState('ready'))
      .catch(() => setWriteState('error'));
  }, [hasApiKey, settings.level, settings.interests]);

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">今日</h1>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>🔥</span>
          <span>连续打卡 {streak} 天</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <TaskCard
          icon="🎧"
          title="听"
          subtitle={lesson ? lesson.title : '暂无可推荐的听力材料'}
          actionLabel="开始"
          done={Boolean(todayLog.listen)}
          onAction={() => (lesson ? navigate(`/listen/${lesson.id}`) : navigate('/listen'))}
        />

        <TaskCard
          icon="📖"
          title="读"
          subtitle={article ? article.title : '暂无可推荐的文章'}
          actionLabel="开始"
          done={Boolean(todayLog.read)}
          onAction={() => (article ? navigate(`/read/${article.id}`) : navigate('/read'))}
          secondary={
            <button onClick={() => navigate('/read')} className="text-xs text-brand-600 underline">
              或粘贴一篇
            </button>
          }
        />

        <TaskCard
          icon="✍️"
          title="译"
          subtitle={
            writeState === 'ready'
              ? '5 句已备好'
              : writeState === 'loading'
                ? '正在准备题目…'
                : writeState === 'no-key'
                  ? '去设置页填入 DeepSeek API Key'
                  : '题目生成失败,进入页面重试'
          }
          actionLabel="开始"
          done={Boolean(todayLog.write)}
          onAction={() => navigate('/write/translate')}
        />

        <TaskCard
          icon="🗂️"
          title="复习"
          subtitle={dueCount > 0 ? `${dueCount} 张卡到期` : '今日无复习 ✓'}
          actionLabel={dueCount > 0 ? '开始' : '查看'}
          done={Boolean(todayLog.reviewCleared)}
          onAction={() => navigate('/vocab')}
        />
      </div>
    </div>
  );
}
