import { useState } from 'react';
import { PRON_LANGS, type PronItem, type PronLang } from '../data/pronunciation';
import { assessScripted, canAssess, getActiveProviderId, speak } from '../lib/speech';

type ScoreState =
  | { status: 'idle' }
  | { status: 'recording' }
  | { status: 'scored'; overall: number | null; matched: boolean | null };

function PronCard({
  item,
  active,
  onTap,
}: {
  item: PronItem;
  active: boolean;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className={`flex flex-col items-center rounded-xl border px-2 py-3 text-center transition-colors ${
        active ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white'
      }`}
    >
      <span className="font-display text-2xl leading-none text-gray-900">{item.symbol}</span>
      {item.roman && <span className="mt-1 text-[11px] text-gray-400">{item.roman}</span>}
      <span className="mt-1.5 text-sm text-gray-700">{item.example}</span>
      <span className="text-[11px] leading-tight text-gray-400">{item.exampleGloss}</span>
    </button>
  );
}

export default function Pronounce() {
  const [langId, setLangId] = useState<PronLang['id']>('yue');
  const [selected, setSelected] = useState<PronItem | null>(null);
  const [score, setScore] = useState<ScoreState>({ status: 'idle' });
  const lang = PRON_LANGS.find((l) => l.id === langId)!;
  const canScore = canAssess();
  const usingAzure = getActiveProviderId() === 'azure';

  const tap = (item: PronItem) => {
    setSelected(item);
    setScore({ status: 'idle' });
    speak(item.speak, lang.locale);
  };

  const record = async () => {
    if (!selected) return;
    setScore({ status: 'recording' });
    try {
      const result = await assessScripted(selected.speak, lang.locale);
      if (result.overall !== null) {
        setScore({ status: 'scored', overall: result.overall, matched: null });
      } else {
        // browser 模式無分數:用詞級是否命中作粗略反饋
        const matched = result.words.length > 0 ? result.words.every((w) => w.errorType === 'none') : null;
        setScore({ status: 'scored', overall: null, matched });
      }
    } catch {
      setScore({ status: 'idle' });
    }
  };

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">发音基础</h1>
      <p className="mt-1 text-xs text-gray-400">粤语粤拼 / 韩语谚文 / 法语音标。点卡片听发音,选中后可跟读评分。</p>

      <div className="mt-4 flex gap-2">
        {PRON_LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => {
              setLangId(l.id);
              setSelected(null);
              setScore({ status: 'idle' });
            }}
            className={`flex-1 rounded-xl py-2 text-sm font-medium ${
              langId === l.id ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 shadow-card'
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      <p className="mt-3 rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-500">{lang.desc}</p>

      {lang.groups.map((group) => (
        <section key={group.title} className="mt-5">
          <h2 className="text-sm font-semibold text-gray-800">{group.title}</h2>
          {group.note && <p className="mt-0.5 text-xs text-gray-400">{group.note}</p>}
          <div className="mt-2 grid grid-cols-4 gap-2">
            {group.items.map((item) => (
              <PronCard
                key={item.symbol + item.example}
                item={item}
                active={selected?.symbol === item.symbol && selected?.example === item.example}
                onTap={() => tap(item)}
              />
            ))}
          </div>
        </section>
      ))}

      {selected && (
        <div className="sticky bottom-20 mt-6 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-card">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl text-gray-900">{selected.symbol}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-700">
                {selected.example} · {selected.exampleGloss}
              </p>
            </div>
            <button
              onClick={() => speak(selected.speak, lang.locale)}
              aria-label="再听一次"
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600"
            >
              🔊 再听
            </button>
          </div>

          {canScore ? (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={record}
                disabled={score.status === 'recording'}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {score.status === 'recording' ? '录音中…' : '🎙️ 跟读评分'}
              </button>
              {score.status === 'scored' && score.overall !== null && (
                <span className="text-sm">
                  <span className="text-lg font-semibold text-gray-900">{Math.round(score.overall)}</span>
                  <span className="text-gray-400"> / 100</span>
                </span>
              )}
              {score.status === 'scored' && score.overall === null && (
                <span className="text-xs text-gray-400">
                  基础模式无评分{score.matched === true ? ' · 识别命中 ✓' : score.matched === false ? ' · 未命中,再试' : ''}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-amber-600">当前环境不支持语音识别,仅可听示范。</p>
          )}
          {canScore && !usingAzure && (
            <p className="mt-2 text-[11px] text-gray-400">配置 Azure 语音服务(设置页)可获得音素级发音评分。</p>
          )}
        </div>
      )}
    </div>
  );
}
