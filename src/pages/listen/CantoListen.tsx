import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCantoLesson, loadCantoLessons, type CantoLesson, type CantoSentence } from '../../data/canto-listening';
import { assessScripted, canAssess, speak, speakSequence } from '../../lib/speech';
import { deleteCustomLesson, saveCustomLesson } from '../../lib/customListen';
import { transcribeAudioUrl } from '../../lib/transcribe';

const LOCALE = 'zh-HK';

const SECTIONS: { type: CantoLesson['type']; label: string }[] = [
  { type: 'custom', label: '自定义音频' },
  { type: 'dialogue', label: '情景对话' },
  { type: 'broadcast', label: '广播' },
  { type: 'live', label: '电台节目（真实音频）' },
];

export function CantoListenList() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<CantoLesson[] | null>(null);
  useEffect(() => {
    loadCantoLessons().then(setLessons);
  }, []);

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">粤语听力</h1>
      <p className="mt-1 text-xs text-gray-400">先盲听整段,再逐句看粤拼与中文,最后跟读评分。</p>

      <button
        onClick={() => navigate('/custom-listen')}
        className="mt-3 w-full rounded-2xl border border-dashed border-brand-300 bg-brand-50 py-3 text-sm font-medium text-brand-700"
      >
        ＋ 添加自定义音频(粘贴链接,浏览器内转写)
      </button>

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
                  <div key={l.id} className="relative">
                    <Link
                      to={`/listen/${l.id}`}
                      className="block rounded-2xl border border-gray-200/70 bg-white p-4 shadow-card"
                    >
                      <div className="font-medium text-gray-900">{l.title}</div>
                      <div className="text-sm text-gray-500">
                        {l.type === 'live' && l.source ? `${l.source} · ` : `${l.desc} · `}
                        {l.sentences.length} 句
                      </div>
                    </Link>
                    {l.type === 'custom' && (
                      <button
                        onClick={() => {
                          deleteCantoCustom(l.id);
                          setLessons((prev) => prev?.filter((x) => x.id !== l.id) ?? null);
                        }}
                        className="absolute right-3 top-3 rounded-lg px-2 py-1 text-xs text-gray-400 hover:text-red-500"
                        aria-label="删除"
                      >
                        删除
                      </button>
                    )}
                  </div>
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

// ---- 自定義聽力:本地文件 / 音頻直鏈 → 瀏覽器內 Whisper 轉寫 → 保存為課程 ----
export function CantoCustom() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [sentences, setSentences] = useState<CantoSentence[] | null>(null);

  // 本地文件轉為臨時 object URL 供試聽/轉寫;卸載或換文件時釋放。
  useEffect(() => {
    if (!file) {
      setObjectUrl('');
      return;
    }
    const u = URL.createObjectURL(file);
    setObjectUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // 有本地文件時用文件(不受跨域/DRM 限制),否則用粘貼的直鏈。
  const src = file ? objectUrl : url.trim();
  const usingFile = !!file;

  const run = async () => {
    if (!src) return;
    setStatus('working');
    setSentences(null);
    setProgress('准备中…');
    try {
      const result = await transcribeAudioUrl(src, 'yue', (msg, pct) =>
        setProgress(pct !== undefined ? `${msg} ${pct}%` : msg),
      );
      if (result.length === 0) {
        setStatus('error');
        setProgress('没有转写出内容(音频可能无人声,或格式不支持)。');
        return;
      }
      setSentences(result);
      setStatus('done');
    } catch {
      setStatus('error');
      setProgress(
        usingFile
          ? '转写失败:该文件可能不是浏览器能解码的音频/视频格式,换 mp3/m4a/mp4 再试。'
          : '转写失败:多半是该链接不允许跨域读取(CORS),或不是可直接播放的音频直链。改用「选择本地文件」最稳。',
      );
    }
  };

  const save = () => {
    if (!sentences) return;
    const lesson: CantoLesson = {
      id: `custom-${Date.now()}`,
      type: 'custom',
      title: title.trim() || (file?.name ?? '自定义音频'),
      desc: '自定义',
      source: '自定义',
      // 本地文件的 object URL 刷新即失效,故不落庫;保留文本,回放用设备语音(TTS)。
      ...(usingFile ? {} : { audioUrl: url.trim() }),
      sentences,
    };
    saveCustomLesson(lesson);
    navigate('/listen');
  };

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">添加自定义音频</h1>
      <p className="mt-1 text-xs text-gray-400">
        选本地音频/视频文件(最稳,YouTube 视频下载后也能传),或粘贴允许跨域的音频直链。浏览器用开源 Whisper
        本地转写成带时间戳的文本。首次会下载模型(数十 MB),音频越长越慢。
      </p>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题(可选)"
        className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
      />

      <label className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-brand-300 bg-brand-50 py-3 text-sm font-medium text-brand-700">
        {file ? `已选:${file.name}` : '选择本地文件(mp3 / m4a / mp4…)'}
        <input
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setSentences(null);
            setStatus('idle');
            setProgress('');
          }}
        />
      </label>

      <div className="my-2 flex items-center gap-3 text-[11px] text-gray-300">
        <span className="h-px flex-1 bg-gray-200" />或粘贴直链<span className="h-px flex-1 bg-gray-200" />
      </div>

      <input
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          if (e.target.value) setFile(null);
        }}
        placeholder="音频直链 https://….mp3"
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
        autoComplete="off"
      />

      {src && <audio src={src} controls preload="none" className="mt-3 w-full" />}

      <button
        onClick={run}
        disabled={!src || status === 'working'}
        className="mt-3 w-full rounded-xl bg-brand-600 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === 'working' ? '转写中…' : '生成文本'}
      </button>

      {usingFile && (
        <p className="mt-2 text-[11px] text-gray-400">
          本地文件不会上传或保存,刷新后原音频无法回放;保存的课程会保留文本,回放改用设备粤语语音朗读。
        </p>
      )}

      {status !== 'idle' && progress && (
        <p className={`mt-3 text-xs ${status === 'error' ? 'text-red-500' : 'text-gray-500'}`}>{progress}</p>
      )}

      {sentences && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-800">转写结果({sentences.length} 句)</p>
            <button onClick={save} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white">
              保存到听力
            </button>
          </div>
          <div className="mt-2 space-y-1.5">
            {sentences.map((s, i) => (
              <p key={i} className="rounded-lg bg-white p-2 text-sm text-gray-800 shadow-card">
                <span className="mr-2 text-[11px] text-gray-300">{Math.floor((s.start ?? 0) / 60)}:{String(Math.floor((s.start ?? 0) % 60)).padStart(2, '0')}</span>
                {s.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function deleteCantoCustom(id: string): void {
  deleteCustomLesson(id);
}
