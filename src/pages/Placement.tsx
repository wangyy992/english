import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { getAllLessons, loadAllLessons } from '../lib/lessons';
import * as articlesLib from '../lib/articles';
import * as writing from '../lib/writing';
import * as ability from '../lib/ability';
import { chatJSON } from '../lib/deepseek';
import { buildPlacementMcqPrompt, PLACEMENT_MCQ_SYSTEM } from '../lib/prompts/placement';
import { assessScripted, canAssess } from '../lib/speech';
import type { AudioLesson, Article } from '../types';

interface Mcq {
  q: string;
  options: string[];
  answer: number;
}

type Step = 'listen' | 'read' | 'shadow' | 'write' | 'done';

// 3 題正確數 → 維度分
function mcqScore(correct: number): number {
  return 35 + correct * 20;
}

async function fetchMcqs(text: string): Promise<Mcq[]> {
  const res = await chatJSON<{ questions: Mcq[] }>(PLACEMENT_MCQ_SYSTEM, buildPlacementMcqPrompt(text), {
    temperature: 0.2,
  });
  const qs = res?.questions;
  if (!Array.isArray(qs) || qs.length === 0 || !qs.every((x) => x && typeof x.q === 'string' && Array.isArray(x.options))) {
    throw new Error('invalid mcq payload');
  }
  return qs.slice(0, 3);
}

function McqBlock({ questions, onDone }: { questions: Mcq[]; onDone: (correct: number) => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  return (
    <div className="mt-4 space-y-4">
      {questions.map((mcq, i) => (
        <div key={i} className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-sm font-medium text-gray-800">
            {i + 1}. {mcq.q}
          </p>
          <div className="mt-2 space-y-1.5">
            {mcq.options.map((opt, j) => (
              <button
                key={j}
                onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  answers[i] === j ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        disabled={!allAnswered}
        onClick={() => onDone(questions.filter((mcq, i) => answers[i] === mcq.answer).length)}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        提交本节
      </button>
    </div>
  );
}

const SHADOW_SENTENCES_COUNT = 3;

export default function Placement() {
  const navigate = useNavigate();
  const { hasApiKey } = useSettings();
  const [step, setStep] = useState<Step>('listen');
  const [lesson, setLesson] = useState<AudioLesson | undefined>(() => getAllLessons()[0]);
  const [article, setArticle] = useState<Article | undefined>(() => articlesLib.getAllArticles()[0]);
  const [mcqs, setMcqs] = useState<Mcq[] | null>(null);
  const [mcqError, setMcqError] = useState(false);
  const [scores, setScores] = useState<Partial<Record<ability.AbilityDim, number>>>({});
  // 跟讀小節
  const [shadowIndex, setShadowIndex] = useState(0);
  const [shadowSamples, setShadowSamples] = useState<number[]>([]);
  const [shadowBusy, setShadowBusy] = useState(false);
  // 寫作小節
  const [essay, setEssay] = useState('');
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    loadAllLessons().then((all) => setLesson((l) => l ?? all[0]));
    articlesLib.loadAllArticles().then((all) => setArticle((a) => a ?? all[0]));
  }, []);

  const currentText = useMemo(() => {
    if (step === 'listen') return lesson?.sentences.map((s) => s.text).join(' ') ?? '';
    if (step === 'read') return article?.paragraphs.join(' ') ?? '';
    return '';
  }, [step, lesson, article]);

  // 進入聽力/閱讀小節時生成理解題
  useEffect(() => {
    if ((step !== 'listen' && step !== 'read') || !currentText || !hasApiKey) return;
    setMcqs(null);
    setMcqError(false);
    fetchMcqs(currentText)
      .then(setMcqs)
      .catch(() => setMcqError(true));
  }, [step, currentText, hasApiKey]);

  const finishDim = (dim: ability.AbilityDim, score: number | null, nextStep: Step) => {
    if (score !== null) setScores((s) => ({ ...s, [dim]: score }));
    setMcqs(null);
    setStep(nextStep);
  };

  const finishAll = (finalScores: Partial<Record<ability.AbilityDim, number>>) => {
    ability.initAbility(finalScores);
    ability.noteVocabRetention(); // 已有複習記錄則覆蓋 vocab 初始分
    navigate('/');
  };

  const shadowSentences = useMemo(
    () => (lesson ? lesson.sentences.slice(0, SHADOW_SENTENCES_COUNT) : []),
    [lesson],
  );

  const handleShadow = async () => {
    const sentence = shadowSentences[shadowIndex];
    if (!sentence) return;
    setShadowBusy(true);
    let sample: number | null = null;
    try {
      const result = await assessScripted(sentence.text);
      const matched = result.words.filter((w) => w.errorType === 'none').length;
      sample = result.overall ?? (result.words.length > 0 ? (matched / result.words.length) * 100 : null);
    } catch {
      // 忽略失敗的句子
    }
    const samples = sample !== null ? [...shadowSamples, sample] : shadowSamples;
    setShadowSamples(samples);
    setShadowBusy(false);
    if (shadowIndex + 1 >= shadowSentences.length) {
      const avg = samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
      finishDim('speaking', avg !== null ? Math.round(avg) : null, 'write');
    } else {
      setShadowIndex((i) => i + 1);
    }
  };

  const handleGradeEssay = async () => {
    setGrading(true);
    try {
      const r = await writing.gradeFreeWrite('Introduce yourself and your goal for learning English (about 50 words).', essay);
      finishDim('writing', (r.score / 5) * 100, 'done');
    } catch {
      finishDim('writing', null, 'done');
    } finally {
      setGrading(false);
    }
  };

  useEffect(() => {
    if (step === 'done') finishAll(scores);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const stepTitle: Record<Exclude<Step, 'done'>, string> = {
    listen: '第 1 节 · 听力(听完音频后答题)',
    read: '第 2 节 · 阅读',
    shadow: '第 3 节 · 跟读 3 句',
    write: '第 4 节 · 写作(约 50 词)',
  };

  if (step === 'done') return null;

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">分级测试</h1>
        <button onClick={() => finishAll(scores)} className="text-xs text-gray-400 underline">
          提前结束
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-400">{stepTitle[step]} · 每节可单独跳过(该维度按 50 分)</p>

      {(step === 'listen' || step === 'read') && (
        <div className="mt-4">
          {step === 'listen' && lesson && <audio controls src={lesson.audioUrl} className="w-full" preload="metadata" />}
          {step === 'read' && article && (
            <div className="max-h-64 overflow-y-auto rounded-xl bg-white p-3 text-sm leading-relaxed text-gray-800 shadow-sm">
              {article.paragraphs.map((p, i) => (
                <p key={i} className="mb-2">
                  {p}
                </p>
              ))}
            </div>
          )}
          {!hasApiKey && <p className="mt-4 text-sm text-amber-600">生成理解题需要 DeepSeek API Key,可跳过本节。</p>}
          {hasApiKey && !mcqs && !mcqError && <p className="mt-4 text-sm text-gray-400">生成理解题中…</p>}
          {mcqError && <p className="mt-4 text-sm text-red-500">题目生成失败,可跳过本节。</p>}
          {mcqs && (
            <McqBlock
              questions={mcqs}
              onDone={(correct) =>
                step === 'listen'
                  ? finishDim('listening', mcqScore(correct), 'read')
                  : finishDim('reading', mcqScore(correct), 'shadow')
              }
            />
          )}
          <button
            onClick={() => (step === 'listen' ? finishDim('listening', null, 'read') : finishDim('reading', null, 'shadow'))}
            className="mt-3 w-full rounded-xl bg-gray-100 py-2.5 text-sm text-gray-500"
          >
            跳过本节
          </button>
        </div>
      )}

      {step === 'shadow' && (
        <div className="mt-4">
          {!canAssess() || shadowSentences.length === 0 ? (
            <p className="text-sm text-amber-600">当前浏览器不支持语音识别,请跳过本节。</p>
          ) : (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">
                句子 {shadowIndex + 1} / {shadowSentences.length}
              </p>
              <p className="mt-2 text-base leading-relaxed text-gray-800">{shadowSentences[shadowIndex]?.text}</p>
              <button
                onClick={handleShadow}
                disabled={shadowBusy}
                className="mt-4 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {shadowBusy ? '录音识别中…' : '🎙️ 朗读这句'}
              </button>
            </div>
          )}
          <button
            onClick={() => finishDim('speaking', null, 'write')}
            className="mt-3 w-full rounded-xl bg-gray-100 py-2.5 text-sm text-gray-500"
          >
            跳过本节
          </button>
        </div>
      )}

      {step === 'write' && (
        <div className="mt-4">
          <p className="text-sm text-gray-700">用大约 50 个英文单词介绍你自己和学英语的目标:</p>
          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            rows={6}
            className="mt-3 w-full rounded-xl border border-gray-200 p-3 text-sm"
            placeholder="Write about 50 words…"
          />
          <button
            onClick={handleGradeEssay}
            disabled={!hasApiKey || grading || essay.trim().split(/\s+/).length < 20}
            className="mt-3 w-full rounded-xl bg-brand-600 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {grading ? '批改中…' : '提交'}
          </button>
          <button
            onClick={() => finishDim('writing', null, 'done')}
            className="mt-3 w-full rounded-xl bg-gray-100 py-2.5 text-sm text-gray-500"
          >
            跳过本节
          </button>
        </div>
      )}
    </div>
  );
}
