import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCantoLesson, loadCantoLessons, type CantoLesson, type CantoSentence } from '../../data/canto-listening';
import { assessScripted, canAssess, speak, speakSequence } from '../../lib/speech';

const LOCALE = 'zh-HK';

const SECTIONS: { type: CantoLesson['type']; label: string }[] = [
  { type: 'dialogue', label: '情景对话' },
  { type: 'broadcast', label: '广播' },
  { type: 'live', label: '电台节目（真实音频）' },
];

export function CantoListenList() {
  const [lessons, setLessons] = useState<CantoLesson[] | null>(null);
  useEffect(() => {
    loadCantoLessons().then(setLessons);
  }, []);

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">粤语听力</h1>
      <p className="mt-1 text-xs text-gray-400">先盲听整段,再逐句看粤拼与中文,最后跟读评分。</p>
      {lessons === null && <p className="mt-4 text-sm text-gray-400">加载中…</p>}
      {lessons &&
        SECTIONS.map((sec) => {
          const items = lessons.filter((l) => l.type === sec.type);
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
                    <div className="text-sm text-gray-500">
                      {l.type === 'live' && l.source ? `${l.source} · ` : `${l.desc} · `}
                      {l.sentences.length} 句
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      <p className="mt-5 rounded-xl bg-gray-100 px-4 py-3 text-xs text-gray-500">
        对话与广播由设备语音合成(粤语 zh-HK);电台节目为真实音频(音频不落库,注明出处),转写由粤语 whisper 生成,可能有误。
      </p>
    </div>
  );
}

type Stage = 'blind' | 'intensive' | 'shadow';
const STAGE_LABEL: Record<Stage, string> = { blind: '盲听', intensive: '精听', shadow: '跟读' };

export function CantoListenLesson() {
  const { id } = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<CantoLesson | null | undefined>(() => (id ? getCantoLesson(id) : null));

  useEffect(() => {
    if (!id) return;
    if (getCantoLesson(id)) {
      setLesson(getCantoLesson(id));
      return;
    }
    loadCantoLessons().then((all) => setLesson(all.find((l) => l.id === id) ?? null));
  }, [id]);

  if (lesson === undefined) return <div className="p-4 text-sm text-gray-400">加载中…</div>;
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
  return lesson.audioUrl ? <AudioLesson lesson={lesson} /> : <TtsLesson lesson={lesson} />;
}

// ---- 自編課程:TTS 播放 ----
function TtsLesson({ lesson }: { lesson: CantoLesson }) {
  const [stage, setStage] = useState<Stage>('blind');
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      stopRef.current?.();
    },
    [],
  );

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
      <StageTabs stage={stage} onChange={(s) => { stop(); setStage(s); }} />

      {stage === 'blind' && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">文本已隐藏,专注听整段。</p>
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
              {s.jyut && <p className="mt-1 text-xs text-gray-400">{s.jyut}</p>}
              {s.zh && <p className="text-sm text-gray-500">{s.zh}</p>}
            </div>
          ))}
        </div>
      )}

      {stage === 'shadow' && <ShadowList sentences={lesson.sentences} />}
    </div>
  );
}

// ---- 真實音頻課程:CDN 音頻 A-B 逐句 ----
function AudioLesson({ lesson }: { lesson: CantoLesson }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const loopEndRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (loopEndRef.current !== null && audio.currentTime >= loopEndRef.current) {
        audio.pause();
        loopEndRef.current = null;
        setActiveIndex(null);
      }
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, []);

  const playSentence = (s: CantoSentence, i: number) => {
    const audio = audioRef.current;
    if (!audio || s.start === undefined) return;
    audio.currentTime = s.start;
    loopEndRef.current = s.end ?? null;
    setActiveIndex(i);
    audio.play().catch(() => {});
  };

  return (
    <div className="p-4 pb-8">
      <h1 className="text-lg font-semibold text-gray-900">{lesson.title}</h1>
      {lesson.source && (
        <p className="text-xs text-gray-400">
          来源:
          {lesson.sourceUrl ? (
            <a href={lesson.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              {lesson.source}
            </a>
          ) : (
            lesson.source
          )}
        </p>
      )}

      <audio ref={audioRef} src={lesson.audioUrl} controls preload="none" className="mt-3 w-full" />

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">点句子从该处播放;粤语 whisper 转写,可能有误。</p>
        <button onClick={() => setReveal((r) => !r)} className="text-xs text-brand-600 underline">
          {reveal ? '隐藏文本' : '显示文本'}
        </button>
      </div>

      {reveal && (
        <div className="mt-3 space-y-2">
          {lesson.sentences.map((s, i) => (
            <button
              key={i}
              onClick={() => playSentence(s, i)}
              className={`block w-full rounded-xl border p-3 text-left ${
                activeIndex === i ? 'border-brand-600 bg-brand-50' : 'border-gray-200/70 bg-white'
              }`}
            >
              <span className="font-display text-base leading-relaxed text-gray-900">{s.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StageTabs({ stage, onChange }: { stage: Stage; onChange: (s: Stage) => void }) {
  return (
    <div className="mt-4 flex gap-2">
      {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`flex-1 rounded-full py-2 text-sm font-medium ${
            stage === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {STAGE_LABEL[s]}
        </button>
      ))}
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
      {sentence.jyut && <p className="mt-0.5 text-xs text-gray-400">{sentence.jyut}</p>}
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
