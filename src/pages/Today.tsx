import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { getAllLessons, loadAllLessons } from '../lib/lessons';
import * as articlesLib from '../lib/articles';
import * as vocab from '../lib/vocab';
import * as writingLib from '../lib/writing';
import * as progress from '../lib/progress';
import * as planner from '../lib/planner';
import { MODULE_LABEL } from '../lib/planner';
import TaskCard from '../components/today/TaskCard';
import DurationPicker from '../components/today/DurationPicker';
import type { AudioLesson, Article, CEFRLevel, DayPlan, PlanTask } from '../types';

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

function lessonMinutes(lesson: AudioLesson | undefined): number {
  const end = lesson?.sentences.at(-1)?.end ?? 0;
  return end / 60;
}

function minutesLabel(min: number): string {
  return min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? `${min % 60}m` : ''}` : `${min}min`;
}

type WriteState = 'loading' | 'ready' | 'no-key' | 'error';

export default function Today() {
  const navigate = useNavigate();
  const { settings, updateSettings, hasApiKey } = useSettings();
  const [plan, setPlan] = useState<DayPlan | null>(() => planner.getTodayPlan());
  const [streak, setStreak] = useState(0);
  const [lesson, setLesson] = useState<AudioLesson | undefined>();
  const [article, setArticle] = useState<Article | undefined>();
  const [writeState, setWriteState] = useState<WriteState>('loading');

  useEffect(() => {
    const p = progress.getProgress();
    setStreak(p.streak);
    setLesson(pickLesson(getAllLessons(), p.completedLessonIds, settings.level));
    setArticle(pickArticle(articlesLib.getAllArticles(), p.completedArticleIds, settings.level));
    let alive = true;
    loadAllLessons().then((all) => {
      if (alive) setLesson(pickLesson(all, p.completedLessonIds, settings.level));
    });
    articlesLib.loadAllArticles().then((all) => {
      if (alive) setArticle(pickArticle(all, p.completedArticleIds, settings.level));
    });
    return () => {
      alive = false;
    };
  }, [settings.level]);

  useEffect(() => {
    if (!plan) return;
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
  }, [plan, hasApiKey, settings.level, settings.interests]);

  const startDay = (minutes: number) => {
    updateSettings({ plannerMinutes: minutes });
    const queue = vocab.getReviewQueue(settings.dailyNewCards);
    const created = planner.createPlan(minutes, settings.plannerWeights, {
      dueCards: queue.entries.length,
      lessonMinutes: lessonMinutes(lesson),
    });
    setPlan(created);
    setStreak(progress.getProgress().streak);
  };

  if (!plan) {
    return <DurationPicker defaultMinutes={settings.plannerMinutes} streak={streak} onStart={startDay} />;
  }

  const doneCount = plan.tasks.filter((t) => t.done).length;

  const writeSubtitle =
    writeState === 'ready'
      ? plan.tasks.find((t) => t.module === 'write')?.meta?.writeMode === 'free'
        ? '自由写作'
        : '5 句中译英'
      : writeState === 'loading'
        ? '正在准备题目…'
        : writeState === 'no-key'
          ? '去设置页填入 DeepSeek API Key'
          : '题目生成失败,进入页面重试';

  const view: Record<PlanTask['module'], { icon: string; subtitle: string; to: string; progressMs: (t: PlanTask) => number }> = {
    listen: {
      icon: '🎧',
      subtitle: lesson ? lesson.title : '暂无可推荐的听力材料',
      to: lesson ? `/listen/${lesson.id}` : '/listen',
      progressMs: (t) => t.playbackMs ?? 0,
    },
    speak: {
      icon: '🎙️',
      subtitle: lesson ? `跟读 · ${lesson.title}` : '跟读练习',
      to: lesson ? `/listen/${lesson.id}?stage=shadow` : '/listen',
      progressMs: (t) => t.spentMs,
    },
    read: {
      icon: '📖',
      subtitle: article ? article.title : '暂无可推荐的文章',
      to: article ? `/read/${article.id}` : '/read',
      progressMs: (t) => t.spentMs,
    },
    write: {
      icon: '✍️',
      subtitle: writeSubtitle,
      to: plan.tasks.find((t) => t.module === 'write')?.meta?.writeMode === 'free' ? '/write/free' : '/write/translate',
      progressMs: (t) => t.spentMs,
    },
    vocab: {
      icon: '🗂️',
      subtitle: (() => {
        const t = plan.tasks.find((x) => x.module === 'vocab');
        return t && (t.meta?.cards ?? 0) > 0 ? `${t.meta?.cards} 张卡` : '今日无复习 ✓';
      })(),
      to: '/vocab',
      progressMs: (t) => t.spentMs,
    },
  };

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">今日</h1>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>🔥</span>
          <span>连续打卡 {streak} 天</span>
        </div>
      </div>

      <p className="mt-1 text-xs text-gray-400">
        今日计划 {minutesLabel(plan.totalMinutes)} · 完成 {doneCount}/{plan.tasks.length}
        {!plan.checkedIn && ` · 完成 ${Math.ceil(plan.tasks.length * planner.STREAK_THRESHOLD)} 项即打卡`}
        {plan.checkedIn && ' · 已打卡 ✓'}
      </p>

      {plan.debts.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          昨日欠账:
          {plan.debts.map((d) => `${MODULE_LABEL[d.module]} ${d.minutes} 分钟`).join(' · ')}
          (仅提示,不计入今日)
        </div>
      )}

      <div className="mt-4 space-y-3">
        {plan.tasks.map((task) => {
          const v = view[task.module];
          const targetMs = task.targetMinutes * 60000;
          return (
            <TaskCard
              key={task.module}
              icon={v.icon}
              title={MODULE_LABEL[task.module]}
              subtitle={v.subtitle}
              actionLabel={task.done ? '再练' : '开始'}
              done={task.done}
              targetLabel={task.targetMinutes > 0 ? minutesLabel(task.targetMinutes) : undefined}
              progress={targetMs > 0 ? Math.min(1, v.progressMs(task) / targetMs) : undefined}
              onAction={() => navigate(v.to)}
            />
          );
        })}
      </div>
    </div>
  );
}
