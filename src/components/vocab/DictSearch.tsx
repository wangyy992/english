import { useState } from 'react';
import { lookupWord, type DictionaryLookup } from '../../lib/dictionary';
import { chatJSON, hasApiKey } from '../../lib/deepseek';
import { speak } from '../../lib/speech';
import * as vocab from '../../lib/vocab';
import * as wordbooks from '../../lib/wordbooks';
import { courseLocale, isEnglishCourse } from '../../lib/lang';

interface LocalHit {
  w: string;
  jyut?: string;
  zh?: string;
}

/** 詞庫頁的直接查詞:英語走免費詞典 + AI 中文;其他語言在內置詞書內搜索。 */
export default function DictSearch({ onAdded }: { onAdded?: () => void }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading'; word: string }
    | { status: 'result'; word: string; dict: DictionaryLookup | null; zh: string | null; zhLoading: boolean }
    | { status: 'local'; word: string; hits: LocalHit[] }
  >({ status: 'idle' });
  const [added, setAdded] = useState(false);
  const english = isEnglishCourse();

  const search = async () => {
    const word = query.trim();
    if (!word) return;
    setAdded(false);
    if (!english) {
      const hits = await wordbooks.searchLocalWords(word);
      setState({ status: 'local', word, hits });
      return;
    }
    setState({ status: 'loading', word });
    const dict = await lookupWord(word);
    const withKey = hasApiKey();
    setState({ status: 'result', word, dict, zh: null, zhLoading: withKey });
    if (withKey) {
      try {
        const zh = await chatJSON<{ defZh: string }>(
          '你是英语教学助手。只输出严格的 JSON,不要任何多余文字或 Markdown 围栏。',
          `给出单词或短语 "${word}" 的简明中文释义(含词性),输出 JSON {"defZh": "..."}`,
          { temperature: 0.3 },
        );
        setState((s) => (s.status === 'result' && s.word === word ? { ...s, zh: zh?.defZh ?? null, zhLoading: false } : s));
      } catch {
        setState((s) => (s.status === 'result' && s.word === word ? { ...s, zhLoading: false } : s));
      }
    }
  };

  const addEnglish = () => {
    if (state.status !== 'result') return;
    vocab.addEntry({
      term: state.word,
      phonetic: state.dict?.phonetic,
      defEn: state.dict?.meanings.map((m) => `${m.partOfSpeech}. ${m.definition}`).join(';'),
      defZh: state.zh ?? undefined,
      context: '',
      source: { module: 'dict', materialId: '' },
    });
    setAdded(true);
    onAdded?.();
  };

  const addLocal = (hit: LocalHit) => {
    vocab.addEntry({
      term: hit.w,
      phonetic: hit.jyut,
      defZh: hit.zh,
      context: '',
      source: { module: 'dict', materialId: '' },
    });
    onAdded?.();
  };

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-card">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder={english ? '查任意单词,如 resilience' : '查词书内的字词(汉字/粤拼/中文)'}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          autoComplete="off"
          autoCapitalize="off"
        />
        <button
          onClick={search}
          disabled={!query.trim() || state.status === 'loading'}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          查词
        </button>
      </div>

      {state.status === 'loading' && <p className="mt-3 text-sm text-gray-400">查询中…</p>}

      {state.status === 'result' && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-gray-900">{state.word}</span>
            {state.dict?.phonetic && <span className="text-sm text-gray-400">{state.dict.phonetic}</span>}
            <button onClick={() => speak(state.word, courseLocale())} aria-label="发音" className="text-base">
              🔊
            </button>
            <button
              onClick={addEnglish}
              disabled={added || vocab.isTermSaved(state.word)}
              className="ml-auto rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {added || vocab.isTermSaved(state.word) ? '已在生词本' : '＋ 生词本'}
            </button>
          </div>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {state.dict === null && <p className="text-gray-400">词典未找到该词{state.zhLoading || state.zh ? ',以下为 AI 释义' : ''}</p>}
            {state.dict?.meanings.map((m, i) => (
              <p key={i}>
                <span className="text-gray-400">{m.partOfSpeech}</span> {m.definition}
              </p>
            ))}
            {state.zhLoading && <p className="text-xs text-gray-400">中文释义生成中…</p>}
            {state.zh && <p className="text-gray-700">{state.zh}</p>}
          </div>
        </div>
      )}

      {state.status === 'local' && (
        <div className="mt-3 space-y-2">
          {state.hits.length === 0 && <p className="text-sm text-gray-400">词书内暂无匹配,试试其他字词。</p>}
          {state.hits.map((hit, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-display text-base text-gray-900">{hit.w}</span>
              <span className="text-xs text-gray-400">
                {hit.jyut} · {hit.zh}
              </span>
              <button onClick={() => speak(hit.w, courseLocale())} aria-label="发音" className="text-sm">
                🔊
              </button>
              <button
                onClick={() => addLocal(hit)}
                disabled={vocab.isTermSaved(hit.w)}
                className="ml-auto rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                {vocab.isTermSaved(hit.w) ? '已收录' : '＋'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
