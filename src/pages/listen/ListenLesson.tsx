import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getLessonById, loadAllLessons } from '../../lib/lessons';
import * as progress from '../../lib/progress';
import * as planner from '../../lib/planner';
import type { AudioLesson, SelfRating } from '../../types';
import AudioPlayer from '../../components/listen/AudioPlayer';
import ShadowControls from '../../components/listen/ShadowControls';
import RetellPanel from '../../components/listen/RetellPanel';
import SelectableText from '../../components/SelectableText';

type Stage = 'blind' | 'intensive' | 'shadow' | 'retell';

const STAGE_LABEL: Record<Stage, string> = { blind: '盲听', intensive: '精听', shadow: '跟读', retell: '复述' };
const RATING_OPTIONS: { value: SelfRating; label: string; className: string }[] = [
  { value: 'good', label: '大概懂了', className: 'bg-green-50 text-green-700' },
  { value: 'half', label: '一半一半', className: 'bg-yellow-50 text-yellow-700' },
  { value: 'poor', label: '基本没懂', className: 'bg-red-50 text-red-600' },
];

export default function ListenLesson() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  // undefined = still loading remote lessons; null = definitively not found
  const [lesson, setLesson] = useState<AudioLesson | null | undefined>(id ? getLessonById(id) : null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLesson(getLessonById(id));
    loadAllLessons().then((all) => {
      if (alive) setLesson(all.find((l) => l.id === id) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const loopRef = useRef<{ start: number; end: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [stage, setStage] = useState<Stage>(searchParams.get('stage') === 'shadow' ? 'shadow' : 'blind');
  const [rowState, setRowState] = useState<{ index: number; expanded: boolean } | null>(null);
  const [understood, setUnderstood] = useState<Set<number>>(new Set());
  const [rated, setRated] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      const loop = loopRef.current;
      if (loop && audio.currentTime >= loop.end) {
        audio.currentTime = loop.start;
      }
    };
    const onLoaded = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [lesson?.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  // 任務計時:盲聽/精聽計入「聽」,跟讀/復述計入「說」
  useEffect(
    () => planner.trackModule(stage === 'shadow' || stage === 'retell' ? 'speak' : 'listen'),
    [stage],
  );

  // 「聽」的硬驗證:音頻實際播放時長
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => planner.addListenPlayback(1000), 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const playSegment = (start: number, end: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    loopRef.current = { start, end };
    audio.currentTime = start;
    audio.play().catch(() => {});
  };

  const handleRowClick = (index: number) => {
    if (!lesson) return;
    const sentence = lesson.sentences[index];
    if (!rowState || rowState.index !== index) {
      setRowState({ index, expanded: stage === 'shadow' });
      playSegment(sentence.start, sentence.end);
    } else if (!rowState.expanded) {
      setRowState({ index, expanded: true });
    } else {
      setRowState({ index, expanded: stage === 'shadow' });
    }
  };

  useEffect(() => {
    if (stage === 'blind' || !lesson) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft' && rowState) {
        const s = lesson.sentences[rowState.index];
        playSegment(s.start, s.end);
      } else if (e.code === 'ArrowRight') {
        const nextIndex = rowState ? Math.min(rowState.index + 1, lesson.sentences.length - 1) : 0;
        setRowState({ index: nextIndex, expanded: stage === 'shadow' ? true : (rowState?.expanded ?? false) });
        const s = lesson.sentences[nextIndex];
        playSegment(s.start, s.end);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stage, rowState, lesson]);

  if (lesson === undefined) {
    return <div className="p-4 text-sm text-gray-400">加载中…</div>;
  }

  if (!lesson) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">未找到该听力材料。</p>
        <Link to="/listen" className="mt-2 inline-block text-sm text-brand-600 underline">
          返回列表
        </Link>
      </div>
    );
  }

  const handleRating = (rating: SelfRating) => {
    progress.setListeningRating(lesson.id, rating);
    progress.markLessonDone(lesson.id);
    progress.markToday('listen');
    setRated(true);
  };

  const toggleUnderstood = (index: number) => {
    setUnderstood((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="pb-8">
      <div className="p-4">
        <h1 className="text-lg font-semibold text-gray-900">{lesson.title}</h1>
        <p className="text-xs text-gray-400">
          {lesson.source} · L{lesson.level}
        </p>
      </div>

      <div className="px-4">
        <AudioPlayer
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          rate={rate}
          onTogglePlay={togglePlay}
          onSeek={(t) => {
            loopRef.current = null;
            seek(t);
          }}
          onRateChange={setRate}
        />
      </div>

      <audio ref={audioRef} src={lesson.audioUrl} preload="metadata" />

      <div className="mt-4 flex gap-2 px-4">
        {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setStage(s);
              loopRef.current = null;
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
        <div className="mt-6 px-4 text-center">
          <p className="text-sm text-gray-400">文本已隐藏,专注听懂大意。</p>
          {!rated ? (
            <div className="mt-6">
              <p className="text-sm text-gray-500">听完了吗?自评一下:</p>
              <div className="mt-3 flex justify-center gap-2">
                {RATING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleRating(opt.value)}
                    className={`rounded-xl px-4 py-2 text-sm ${opt.className}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-green-600">已记录 ✓</p>
          )}
        </div>
      )}

      {stage === 'retell' && <RetellPanel originalText={lesson.sentences.map((s) => s.text).join(' ')} />}

      {stage !== 'blind' && stage !== 'retell' && (
        <div className="mt-4 space-y-2 px-4">
          {lesson.sentences.map((sentence, i) => {
            const expanded = stage === 'shadow' || (rowState?.index === i && rowState.expanded);
            const active = rowState?.index === i;
            return (
              <div key={i} className={`rounded-xl p-3 shadow-sm ${active ? 'bg-brand-50' : 'bg-white'}`}>
                <button onClick={() => handleRowClick(i)} className="flex w-full items-center justify-between text-left">
                  <span className="text-sm text-gray-500">
                    #{i + 1} · {Math.round(sentence.end - sentence.start)}s
                  </span>
                  <span className="flex items-center gap-2">
                    {understood.has(i) && <span className="text-xs text-green-600">✓ 听懂了</span>}
                    <span className="text-gray-300">{expanded ? '▾' : '▸'}</span>
                  </span>
                </button>
                {expanded && (
                  <div className="mt-2">
                    <SelectableText
                      context={sentence.text}
                      source={{ module: 'listen', materialId: lesson.id }}
                      as="p"
                      className="text-base leading-relaxed text-gray-800"
                    />
                    <button onClick={() => toggleUnderstood(i)} className="mt-2 text-xs text-gray-400">
                      {understood.has(i) ? '✓ 已标记听懂' : '标记 ✓ 听懂了'}
                    </button>
                    {stage === 'shadow' && (
                      <ShadowControls
                        sentenceText={sentence.text}
                        playOriginal={() => playSegment(sentence.start, sentence.end)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
