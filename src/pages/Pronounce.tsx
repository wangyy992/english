import { useState } from 'react';
import { PRON_LANGS, type PronItem, type PronLang } from '../data/pronunciation';
import { PHRASE_LANGS, type Phrase } from '../data/phrases';
import { assessScripted, canAssess, getActiveProviderId, speak } from '../lib/speech';
import { getCourseLang } from '../lib/lang';

function defaultPronLang(): PronLang['id'] {
  const c = getCourseLang();
  return c === 'yue' || c === 'ko' || c === 'fr' ? c : 'yue';
}

type Mode = 'sounds' | 'phrases';

// 統一的練習目標:發音音位或常用短語都歸一為 speak(朗讀+評分文本)。
interface Target {
  key: string;
  main: string;
  sub: string;
  speak: string;
}

type ScoreState =
  | { status: 'idle' }
  | { status: 'recording' }
  | { status: 'scored'; overall: number | null; matched: boolean | null };

function pronToTarget(item: PronItem): Target {
  return { key: item.symbol + item.example, main: item.symbol, sub: `${item.example} · ${item.exampleGloss}`, speak: item.speak };
}

function phraseToTarget(p: Phrase): Target {
  return { key: p.text, main: p.text, sub: `${p.roman} · ${p.zh}`, speak: p.text };
}

export default function Pronounce() {
  const [langId, setLangId] = useState<PronLang['id']>(defaultPronLang);
  const [mode, setMode] = useState<Mode>('sounds');
  const [target, setTarget] = useState<Target | null>(null);
  const [score, setScore] = useState<ScoreState>({ status: 'idle' });

  const pronLang = PRON_LANGS.find((l) => l.id === langId)!;
  const phraseLang = PHRASE_LANGS.find((l) => l.id === langId)!;
  const locale = pronLang.locale;
  const canScore = canAssess();
  const usingAzure = getActiveProviderId() === 'azure';

  const select = (t: Target) => {
    setTarget(t);
    setScore({ status: 'idle' });
    speak(t.speak, locale);
  };

  const switchLang = (id: PronLang['id']) => {
    setLangId(id);
    setTarget(null);
    setScore({ status: 'idle' });
  };

  const record = async () => {
    if (!target) return;
    setScore({ status: 'recording' });
    try {
      const result = await assessScripted(target.speak, locale);
      if (result.overall !== null) {
        setScore({ status: 'scored', overall: result.overall, matched: null });
      } else {
        const matched = result.words.length > 0 ? result.words.every((w) => w.errorType === 'none') : null;
        setScore({ status: 'scored', overall: null, matched });
      }
    } catch {
      setScore({ status: 'idle' });
    }
  };

  // 英語課(探索用)顯示三語 tab;具體語言課程鎖定該語言、不顯示切換
  const showLangTabs = getCourseLang() === 'en';

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">{showLangTabs ? '语言基础' : `${pronLang.name}发音`}</h1>
      <p className="mt-1 text-xs text-gray-400">点条目听发音,选中后可跟读评分。</p>

      {showLangTabs && (
        <div className="mt-4 flex gap-2">
          {PRON_LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => switchLang(l.id)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                langId === l.id ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 shadow-card'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {(['sounds', 'phrases'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setTarget(null);
              setScore({ status: 'idle' });
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              mode === m ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {m === 'sounds' ? '发音' : '常用短语'}
          </button>
        ))}
      </div>

      {mode === 'sounds' ? (
        <>
          <p className="mt-3 rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-500">{pronLang.desc}</p>
          {pronLang.groups.map((group) => (
            <section key={group.title} className="mt-5">
              <h2 className="text-sm font-semibold text-gray-800">{group.title}</h2>
              {group.note && <p className="mt-0.5 text-xs text-gray-400">{group.note}</p>}
              <div className="mt-2 grid grid-cols-4 gap-2">
                {group.items.map((item) => {
                  const t = pronToTarget(item);
                  return (
                    <button
                      key={t.key}
                      onClick={() => select(t)}
                      className={`flex flex-col items-center rounded-xl border px-2 py-3 text-center ${
                        target?.key === t.key ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <span className="font-display text-2xl leading-none text-gray-900">{item.symbol}</span>
                      {item.roman && <span className="mt-1 text-[11px] text-gray-400">{item.roman}</span>}
                      <span className="mt-1.5 text-sm text-gray-700">{item.example}</span>
                      <span className="text-[11px] leading-tight text-gray-400">{item.exampleGloss}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      ) : (
        <>
          {phraseLang.groups.map((group) => (
            <section key={group.title} className="mt-5">
              <h2 className="text-sm font-semibold text-gray-800">{group.title}</h2>
              <div className="mt-2 space-y-2">
                {group.items.map((p) => {
                  const t = phraseToTarget(p);
                  return (
                    <button
                      key={t.key}
                      onClick={() => select(t)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                        target?.key === t.key ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-base text-gray-900">{p.text}</span>
                        <span className="block text-xs text-gray-400">
                          {p.roman} · {p.zh}
                        </span>
                      </span>
                      <span className="shrink-0 text-gray-300">🔊</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {target && (
        <div className="sticky bottom-20 mt-6 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg text-gray-900">{target.main}</p>
              <p className="truncate text-xs text-gray-400">{target.sub}</p>
            </div>
            <button
              onClick={() => speak(target.speak, locale)}
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
