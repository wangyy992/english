import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CANTO_LESSONS, getCantoLesson, type CantoSentence } from '../../data/canto-listening';
import { assessScripted, canAssess, speak, speakSequence } from '../../lib/speech';

const LOCALE = 'zh-HK';

const SECTIONS: { type: 'dialogue' | 'broadcast'; label: string }[] = [
  { type: 'dialogue', label: '情景对话' },
  { type: 'broadcast', label: '广播' },
];

export function CantoListenList() {
  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">粤语听力</h1>
      <p className="mt-1 text-xs text-gray-400">先盲听整段,再逐句看粤拼与中文,最后跟读评分。</p>
      {SECTIONS.map((sec) => {
        const items = CANTO_LESSONS.filter((l) => l.type === sec.type);
        if (items.length === 0) return null;
        return (
          <section key={sec.type} className="mt-5">
            <h2 className="text-sm font-semibold text-gray-800">{sec.label}</h2>
            <div className="mt-2 space-y-3">
              {items.map((l) => (
                <Link
                  key={l.id}
                  to={`/listen/${l.id}`}
                  className="block rounded-2xl border border-gray-200/70 bg-white p-4 shadow-card"
                >
                  <div className="font-medium text-gray-900">{l.title}</div>
                  <div className="text-sm text-gray-500">{l.desc} · {l.sentences.length} 句</div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      <p className="mt-5 rounded-xl bg-gray-100 px-4 py-3 text-xs text-gray-500">
        朗读由设备语音合成(粤语 zh-HK),需系统装有粤语语音;真实电台素材接入待后续。
      </p>
    </div>
  );
}

type Stage = 'blind' | 'intensive' | 'shadow';
const STAGE_LABEL: Record<Stage, string> = { blind: '盲听', intensive: '精听', shadow: '跟读' };

export function CantoListenLesson() {
  const { id } = useParams<{ id: string }>();
  const lesson = id ? getCantoLesson(id) : undefined;
  const [stage, setStage] = useState<Stage>('blind');
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      stopRef.current?.();
    },
    [],
  );

  if (!lesson) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">未找到该课程。</p>
        <Link to="/listen" className="mt-2 inline-block text-sm text-brand-600 underline">
          返回列表
        </Link>
      </div>
    );
  }

  const playAll = () => {
    stopRef.current?.();
    stopRef.current = speakSequence(
      lesson.sentences.map((s) => s.text),
      LOCALE,
      (i) => setPlayingIndex(i),
      () => setPlayingIndex(null),
    );
  };

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setPlayingIndex(null);
  };

  return (
    <div className="p-4 pb-8">
      <h1 className="text-lg font-semibold text-gray-900">{lesson.title}</h1>
      <p className="text-xs text-gray-400">{lesson.desc}</p>

      <div className="mt-4 flex gap-2">
        {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              stop();
              setStage(s);
            }}
            className={`flex-1 rounded-full py-2 text-sm font-medium ${
              stage === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {STAGE_LABEL[s]}
          </button>
        ))}
      </div>

      {stage === 'blind' && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">文本已隐藏,专注听整段对话。</p>
          <button
            onClick={playingIndex === null ? playAll : stop}
            className="mt-4 rounded-2xl bg-brand-600 px-8 py-3 text-sm font-medium text-white"
          >
            {playingIndex === null ? '▶ 播放全文' : `■ 停止(第 ${playingIndex + 1} 句)`}
          </button>
        </div>
      )}

      {stage === 'intensive' && (
        <div className="mt-4 space-y-2">
          {lesson.sentences.map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-200/70 bg-white p-3 shadow-card">
              <button onClick={() => speak(s.text, LOCALE)} className="flex w-full items-start justify-between gap-2 text-left">
                <span className="font-display text-base leading-relaxed text-gray-900">{s.text}</span>
                <span className="shrink-0 text-gray-300">🔊</span>
              </button>
              <p className="mt-1 text-xs text-gray-400">{s.jyut}</p>
              <p className="text-sm text-gray-500">{s.zh}</p>
            </div>
          ))}
        </div>
      )}

      {stage === 'shadow' && <ShadowList sentences={lesson.sentences} />}
    </div>
  );
}

function ShadowList({ sentences }: { sentences: CantoSentence[] }) {
  const supported = canAssess();
  return (
    <div className="mt-4 space-y-2">
      {!supported && <p className="text-xs text-amber-600">当前环境不支持语音识别,仅可听示范。</p>}
      {sentences.map((s, i) => (
        <ShadowRow key={i} sentence={s} canScore={supported} />
      ))}
    </div>
  );
}

function ShadowRow({ sentence, canScore }: { sentence: CantoSentence; canScore: boolean }) {
  const [state, setState] = useState<'idle' | 'recording' | number | 'nomark'>('idle');
  const record = async () => {
    setState('recording');
    try {
      const r = await assessScripted(sentence.text, LOCALE);
      setState(r.overall !== null ? Math.round(r.overall) : 'nomark');
    } catch {
      setState('idle');
    }
  };
  return (
    <div className="rounded-xl border border-gray-200/70 bg-white p-3 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-base text-gray-900">{sentence.text}</span>
        <button onClick={() => speak(sentence.text, LOCALE)} className="shrink-0 text-gray-300">🔊</button>
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{sentence.jyut}</p>
      {canScore && (
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={record}
            disabled={state === 'recording'}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {state === 'recording' ? '录音中…' : '🎙️ 跟读'}
          </button>
          {typeof state === 'number' && (
            <span className="text-sm">
              <span className="font-semibold text-gray-900">{state}</span>
              <span className="text-gray-400"> / 100</span>
            </span>
          )}
          {state === 'nomark' && <span className="text-xs text-gray-400">基础模式无评分(配 Azure 可评分)</span>}
        </div>
      )}
    </div>
  );
}
