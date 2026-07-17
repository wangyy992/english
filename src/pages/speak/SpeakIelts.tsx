import { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { chatJSON } from '../../lib/deepseek';
import { buildIeltsGradePrompt, buildIeltsQuestionsSystem, IELTS_GRADE_SYSTEM } from '../../lib/prompts/ielts';
import { speak, type UnscriptedResult } from '../../lib/speech';
import * as planner from '../../lib/planner';
import * as ability from '../../lib/ability';
import VoiceInput from '../../components/speak/VoiceInput';

type Part = 1 | 2 | 3;

interface DimGrade {
  band: number | null;
  evidence: string;
}

interface Grade {
  fluency_coherence: DimGrade;
  lexical_resource: DimGrade;
  grammatical_range: DimGrade;
  pronunciation: DimGrade;
}

const DIM_LABELS: Record<keyof Grade, string> = {
  fluency_coherence: '流利与连贯',
  lexical_resource: '词汇',
  grammatical_range: '语法',
  pronunciation: '发音',
};

/** Azure 0-100 → band 0-9(0.5 步進) */
function pronBand(score: number): number {
  return Math.min(9, Math.round((score / 100) * 9 * 2) / 2);
}

function isValidGrade(g: unknown): g is Grade {
  if (!g || typeof g !== 'object') return false;
  return (['fluency_coherence', 'lexical_resource', 'grammatical_range', 'pronunciation'] as const).every((k) => {
    const dim = (g as Record<string, unknown>)[k] as Record<string, unknown> | undefined;
    return dim && typeof dim.evidence === 'string' && (dim.band === null || typeof dim.band === 'number');
  });
}

type Flow =
  | { status: 'pick' }
  | { status: 'generating'; part: Part }
  | { status: 'prep'; part: 2; topic: string; bullets: string[]; countdown: number }
  | { status: 'asking'; part: Part; questions: string[]; index: number; topic?: string; bullets?: string[] }
  | { status: 'grading' }
  | { status: 'result'; grade: Grade };

export default function SpeakIelts() {
  const { hasApiKey } = useSettings();
  const [flow, setFlow] = useState<Flow>({ status: 'pick' });
  const [qa, setQa] = useState<{ question: string; answer: string }[]>([]);
  const [pronScores, setPronScores] = useState<number[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => planner.trackModule('speak'), []);

  // Part 2 準備倒計時
  useEffect(() => {
    if (flow.status !== 'prep') return;
    if (flow.countdown <= 0) {
      setFlow({ status: 'asking', part: 2, questions: [flow.topic], index: 0, topic: flow.topic, bullets: flow.bullets });
      return;
    }
    const id = window.setTimeout(() => setFlow({ ...flow, countdown: flow.countdown - 1 }), 1000);
    return () => window.clearTimeout(id);
  }, [flow]);

  const startPart = async (part: Part) => {
    setFlow({ status: 'generating', part });
    setQa([]);
    setPronScores([]);
    setError(false);
    try {
      if (part === 2) {
        const res = await chatJSON<{ topic: string; bullets: string[] }>(buildIeltsQuestionsSystem(2), '出题');
        if (!res || typeof res.topic !== 'string' || !Array.isArray(res.bullets)) throw new Error('bad cue card');
        setFlow({ status: 'prep', part: 2, topic: res.topic, bullets: res.bullets.slice(0, 4), countdown: 60 });
      } else {
        const res = await chatJSON<{ questions: string[] }>(buildIeltsQuestionsSystem(part), '出题');
        if (!res || !Array.isArray(res.questions) || res.questions.length === 0) throw new Error('bad questions');
        const questions = res.questions.slice(0, 4).filter((q) => typeof q === 'string');
        setFlow({ status: 'asking', part, questions, index: 0 });
        speak(questions[0]);
      }
    } catch {
      setError(true);
      setFlow({ status: 'pick' });
    }
  };

  const gradePart = async (part: Part, answers: { question: string; answer: string }[], prons: number[]) => {
    setFlow({ status: 'grading' });
    try {
      const grade = await chatJSON<Grade>(IELTS_GRADE_SYSTEM, buildIeltsGradePrompt(part, answers), {
        temperature: 0.2,
      });
      if (!isValidGrade(grade)) throw new Error('bad grade payload');
      // 發音分取 Azure(無則保持 null)
      const pronAvg = prons.length > 0 ? prons.reduce((a, b) => a + b, 0) / prons.length : null;
      grade.pronunciation = {
        band: pronAvg !== null ? pronBand(pronAvg) : null,
        evidence: pronAvg !== null ? `Azure 发音评测均分 ${Math.round(pronAvg)}/100` : '未配置 Azure,无发音评分',
      };
      const bands = [grade.fluency_coherence.band, grade.lexical_resource.band, grade.grammatical_range.band].filter(
        (b): b is number => b !== null,
      );
      ability.noteSpeakingActivity(
        bands.length > 0 ? (bands.reduce((a, b) => a + b, 0) / bands.length / 9) * 100 : null,
        pronAvg,
      );
      setFlow({ status: 'result', grade });
    } catch {
      setError(true);
      setFlow({ status: 'pick' });
    }
  };

  const handleAnswer = (result: UnscriptedResult) => {
    if (flow.status !== 'asking') return;
    if (result.overall !== null) setPronScores((xs) => [...xs, result.overall as number]);
    const entry = { question: flow.questions[flow.index], answer: result.transcript || '(未识别到语音)' };
    const answers = [...qa, entry];
    setQa(answers);
    if (flow.index + 1 >= flow.questions.length) {
      void gradePart(flow.part, answers, result.overall !== null ? [...pronScores, result.overall] : pronScores);
    } else {
      const next = flow.index + 1;
      setFlow({ ...flow, index: next });
      speak(flow.questions[next]);
    }
  };

  if (!hasApiKey) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-gray-900">雅思口语模拟</h1>
        <p className="mt-4 text-sm text-gray-500">去设置页填入 DeepSeek API Key 以使用模拟考试。</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">雅思口语模拟</h1>
      <p className="mt-1 text-xs text-gray-400">AI 生成仿真题,非真题。评分仅供参考。</p>

      {flow.status === 'pick' && (
        <div className="mt-4 space-y-3">
          {([1, 2, 3] as Part[]).map((p) => (
            <button
              key={p}
              onClick={() => void startPart(p)}
              className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm"
            >
              <span>
                <span className="block font-medium text-gray-900">Part {p}</span>
                <span className="block text-sm text-gray-500">
                  {p === 1 ? '日常问答 · 4 题' : p === 2 ? '话题陈述 · 1 分钟准备 + 2 分钟作答' : '深入讨论 · 4 题'}
                </span>
              </span>
              <span className="text-gray-300">▸</span>
            </button>
          ))}
          {error && <p className="text-sm text-red-500">出题或评分失败,请重试。</p>}
        </div>
      )}

      {flow.status === 'generating' && <p className="mt-6 text-sm text-gray-400">出题中…</p>}

      {flow.status === 'prep' && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-base font-medium text-gray-900">{flow.topic}</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
            {flow.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p className="mt-4 text-center text-2xl font-semibold tabular-nums text-brand-600">{flow.countdown}s</p>
          <p className="text-center text-xs text-gray-400">准备时间,可打草稿</p>
          <button
            onClick={() => setFlow({ status: 'asking', part: 2, questions: [flow.topic], index: 0, topic: flow.topic, bullets: flow.bullets })}
            className="mx-auto mt-3 block rounded-xl bg-brand-600 px-6 py-2 text-sm text-white"
          >
            直接开始作答
          </button>
        </div>
      )}

      {flow.status === 'asking' && (
        <div className="mt-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400">
              Part {flow.part} · 第 {flow.index + 1}/{flow.questions.length} 题
            </p>
            <button onClick={() => speak(flow.questions[flow.index])} className="mt-2 text-left">
              <p className="text-base leading-relaxed text-gray-900">
                {flow.questions[flow.index]} <span className="text-xs text-gray-300">🔊</span>
              </p>
            </button>
            {flow.part === 2 && flow.bullets && (
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
                {flow.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 flex justify-center">
            <VoiceInput
              onResult={handleAnswer}
              maxSeconds={flow.part === 2 ? 120 : 45}
              label={flow.part === 2 ? '🎙️ 开始 2 分钟作答' : '🎙️ 回答本题'}
            />
          </div>
        </div>
      )}

      {flow.status === 'grading' && <p className="mt-6 text-sm text-gray-400">评分中…</p>}

      {flow.status === 'result' && (
        <div className="mt-4 space-y-3">
          {(Object.keys(DIM_LABELS) as (keyof Grade)[]).map((k) => (
            <div key={k} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-gray-900">{DIM_LABELS[k]}</span>
                <span className="text-lg font-semibold text-brand-600">
                  {flow.grade[k].band !== null ? flow.grade[k].band : '—'}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{flow.grade[k].evidence}</p>
            </div>
          ))}
          <button
            onClick={() => setFlow({ status: 'pick' })}
            className="w-full rounded-xl bg-gray-100 py-2.5 text-sm text-gray-500"
          >
            再来一组
          </button>
        </div>
      )}
    </div>
  );
}
