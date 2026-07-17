import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { getAllLessons, loadAllLessons } from '../lib/lessons';
import * as articlesLib from '../lib/articles';
import * as vocab from '../lib/vocab';
import * as writingLib from '../lib/writing';
import * as progress from '../lib/progress';
import * as planner from '../lib/planner';
import * as ability from '../lib/ability';
import * as rewards from '../lib/rewards';
import * as coach from '../lib/coach';
import { MODULE_LABEL } from '../lib/planner';
import TaskCard from '../components/today/TaskCard';
import DurationPicker from '../components/today/DurationPicker';
import AbilityRadar from '../components/today/AbilityRadar';
import { ListenIcon, ReadIcon, SpeakIcon, VocabIcon, WriteIcon } from '../components/icons';
import type { ReactNode } from 'react';
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
  const [abilityData, setAbilityData] = useState(ability.getAbility);
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
    const prevPlan = planner.getPrevPlanForReview(); // 必須在 createPlan 覆蓋前取
    const created = planner.createPlan(minutes, planner.effectiveWeights(settings), {
      dueCards: queue.entries.length,
      lessonMinutes: lessonMinutes(lesson),
      strictness: settings.strictness,
    });
    setPlan(created);
    setStreak(progress.getProgress().streak);
    if (prevPlan && hasApiKey) {
      coach
        .generateDailyReview(prevPlan)
        .then((comment) => {
          planner.setYesterdayComment(comment);
          setPlan(planner.getTodayPlan());
        })
        .catch(() => {});
    }
  };

  // 硬核模式提醒:有欠账時請求通知權限並提醒一次(真 Web Push 留待薄後端)
  useEffect(() => {
    if (settings.strictness !== 'hardcore' || !plan || plan.debts.length === 0) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    } else if (Notification.permission === 'granted' && !sessionStorage.getItem('robin-reminded')) {
      sessionStorage.setItem('robin-reminded', '1');
      try {
        new Notification('知更 Robin', { body: '还有昨日欠账等着补上,今天先赢回来。' });
      } catch {
        // 某些平台需經 SW 發通知,忽略
      }
    }
  }, [settings.strictness, plan]);

  // 當日收官點評:任務全完成且尚無點評時生成一次
  useEffect(() => {
    if (!plan || plan.coachComment || !hasApiKey) return;
    if (planner.completionRatio(plan) < 1) return;
    let alive = true;
    coach
      .generateDailyReview(plan)
      .then((comment) => {
        planner.setCoachComment(comment);
        if (alive) setPlan(planner.getTodayPlan());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [plan, hasApiKey]);

  const placementBanner = !abilityData.initialized && (
    <div className="mx-4 mt-3 rounded-xl bg-brand-50 px-4 py-3">
      <p className="text-sm text-brand-700">先做个约 15 分钟的分级测试,让任务分配更贴合你的水平。</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => navigate('/placement')}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"
        >
          开始测试
        </button>
        <button
          onClick={() => {
            ability.initAbility(null);
            setAbilityData(ability.getAbility());
          }}
          className="rounded-lg bg-white px-3 py-1.5 text-xs text-gray-500"
        >
          跳过(全部按 50 分)
        </button>
      </div>
    </div>
  );

  if (!plan) {
    const suggested = planner.suggestedMinutes(settings.plannerMinutes, settings.strictness);
    return (
      <div>
        {placementBanner}
        {suggested < settings.plannerMinutes && (
          <p className="mx-4 mt-3 rounded-xl bg-green-50 px-4 py-2 text-xs text-green-700">
            最近几天没达标,今天目标已自动下调 20%——先赢回来。
          </p>
        )}
        <DurationPicker defaultMinutes={suggested} streak={streak} onStart={startDay} />
      </div>
    );
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

  const view: Record<PlanTask['module'], { icon: ReactNode; subtitle: string; to: string; progressMs: (t: PlanTask) => number }> = {
    listen: {
      icon: <ListenIcon />,
      subtitle: lesson ? lesson.title : '暂无可推荐的听力材料',
      to: lesson ? `/listen/${lesson.id}` : '/listen',
      progressMs: (t) => t.playbackMs ?? 0,
    },
    speak: {
      icon: <SpeakIcon />,
      subtitle: '跟读 / 情景对话 / 雅思模拟',
      to: '/speak',
      progressMs: (t) => t.spentMs,
    },
    read: {
      icon: <ReadIcon />,
      subtitle: article ? article.title : '暂无可推荐的文章',
      to: article ? `/read/${article.id}` : '/read',
      progressMs: (t) => t.spentMs,
    },
    write: {
      icon: <WriteIcon />,
      subtitle: writeSubtitle,
      to: plan.tasks.find((t) => t.module === 'write')?.meta?.writeMode === 'free' ? '/write/free' : '/write/translate',
      progressMs: (t) => t.spentMs,
    },
    vocab: {
      icon: <VocabIcon />,
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
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>⭐ {rewards.getRewards().points}</span>
          <span>🔥 {streak} 天</span>
        </div>
      </div>

      <p className="mt-1 text-xs text-gray-400">
        今日计划 {minutesLabel(plan.totalMinutes)} · 完成 {doneCount}/{plan.tasks.length}
        {!plan.checkedIn && ` · 完成 ${Math.ceil(plan.tasks.length * planner.STREAK_THRESHOLD)} 项即打卡`}
        {plan.checkedIn && ' · 已打卡 ✓'}
      </p>

      {plan.debts.length > 0 && (
        <div
          className={`mt-3 rounded-xl px-4 py-3 text-sm ${
            settings.strictness === 'hardcore' && planner.lastThreeMissed()
              ? 'bg-red-50 font-medium text-red-600'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          昨日欠账:
          {plan.debts.map((d) => `${MODULE_LABEL[d.module]} ${d.minutes} 分钟`).join(' · ')}
          {settings.strictness === 'hardcore' ? '(已滚入今日目标,封顶 +50%)' : '(仅提示,不计入今日)'}
        </div>
      )}

      {plan.yesterdayComment && (
        <div className="mt-3 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
          <span className="text-xs text-gray-400">昨日点评 · </span>
          {plan.yesterdayComment}
        </div>
      )}

      {plan.coachComment && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <span className="text-xs text-brand-400">今日点评 · </span>
          {plan.coachComment}
        </div>
      )}

      {placementBanner && <div className="-mx-4">{placementBanner}</div>}

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

      {abilityData.initialized && (
        <div className="mt-5 flex justify-center">
          <AbilityRadar scores={abilityData.scores} />
        </div>
      )}
    </div>
  );
}
