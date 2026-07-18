import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { lookupWord, type DictionaryLookup } from '../lib/dictionary';
import { speak } from '../lib/speech';
import { courseLocale } from '../lib/lang';
import { chatJSON } from '../lib/deepseek';
import * as vocab from '../lib/vocab';
import type { LookupRequest } from '../context/WordLookupContext';

interface ZhResult {
  defZh: string;
  sentZh: string;
}

const CARD_WIDTH = 288;
const CARD_HEIGHT_ESTIMATE = 320;
const MARGIN = 8;

function clampPosition(anchor: { x: number; y: number }): { left: number; top: number } {
  const left = Math.max(MARGIN, Math.min(anchor.x - CARD_WIDTH / 2, window.innerWidth - CARD_WIDTH - MARGIN));
  let top = anchor.y + 8;
  if (top + CARD_HEIGHT_ESTIMATE > window.innerHeight - MARGIN) {
    top = Math.max(MARGIN, anchor.y - CARD_HEIGHT_ESTIMATE - 8);
  }
  return { left, top };
}

export default function WordPopoverCard({ request, onClose }: { request: LookupRequest; onClose: () => void }) {
  const { word, context, source } = request;
  const { hasApiKey } = useSettings();
  const [dict, setDict] = useState<DictionaryLookup | null | 'loading'>('loading');
  const [zh, setZh] = useState<ZhResult | 'loading' | 'error' | null>(null);
  const [added, setAdded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const position = clampPosition(request.anchor);

  useEffect(() => {
    let alive = true;
    setDict('loading');
    lookupWord(word).then((res) => {
      if (alive) setDict(res);
    });
    return () => {
      alive = false;
    };
  }, [word]);

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [onClose]);

  const handleZh = async () => {
    setZh('loading');
    try {
      const result = await chatJSON<ZhResult>(
        '你是英语教学助手。只输出严格的 JSON,不要任何多余文字或 Markdown 围栏。',
        `解释单词或短语 "${word}" 在句子 "${context}" 中的含义,输出 JSON {"defZh": "中文释义", "sentZh": "整句翻译"}`,
      );
      setZh(result);
    } catch {
      setZh('error');
    }
  };

  const handleAdd = () => {
    vocab.addEntry({
      term: word,
      phonetic: dict && dict !== 'loading' ? dict.phonetic : undefined,
      defEn: dict && dict !== 'loading' ? dict.meanings[0]?.definition : undefined,
      defZh: zh && zh !== 'loading' && zh !== 'error' ? zh.defZh : undefined,
      context,
      source,
    });
    setAdded(true);
    onClose();
  };

  return (
    <div
      ref={cardRef}
      style={{ left: position.left, top: position.top, width: CARD_WIDTH }}
      className="fixed z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-base font-semibold text-gray-900">{word}</span>
          {dict && dict !== 'loading' && dict.phonetic && (
            <span className="ml-2 text-sm text-gray-400">{dict.phonetic}</span>
          )}
        </div>
        <button onClick={() => speak(word, courseLocale())} aria-label="发音" className="shrink-0 text-lg">
          🔊
        </button>
      </div>

      <div className="mt-2 space-y-1 text-sm text-gray-600">
        {dict === 'loading' && <p className="text-gray-400">加载中…</p>}
        {dict === null && <p className="text-gray-400">未找到释义</p>}
        {dict &&
          dict !== 'loading' &&
          dict.meanings.map((m, i) => (
            <p key={i}>
              <span className="text-gray-400">{m.partOfSpeech}</span> {m.definition}
            </p>
          ))}
      </div>

      <div className="mt-3 border-t border-gray-100 pt-3">
        {!zh && hasApiKey && (
          <button onClick={handleZh} className="text-sm font-medium text-brand-600">
            查看中文释义
          </button>
        )}
        {!zh && !hasApiKey && <p className="text-xs text-gray-400">去设置页填入 DeepSeek API Key 以查看中文释义</p>}
        {zh === 'loading' && <p className="text-sm text-gray-400">翻译中…</p>}
        {zh === 'error' && <p className="text-sm text-red-500">获取失败,请重试</p>}
        {zh && zh !== 'loading' && zh !== 'error' && (
          <div className="text-sm text-gray-700">
            <p>{zh.defZh}</p>
            <p className="mt-1 text-gray-400">{zh.sentZh}</p>
          </div>
        )}
      </div>

      <button
        onClick={handleAdd}
        disabled={added}
        className="mt-3 w-full rounded-xl bg-brand-600 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        ＋ 生词本
      </button>
    </div>
  );
}
