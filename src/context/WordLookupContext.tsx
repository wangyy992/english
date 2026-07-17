import { createContext, useContext, useState, type ReactNode } from 'react';
import type { VocabEntry } from '../types';
import WordPopoverCard from '../components/WordPopoverCard';
import { noteLookup } from '../lib/ability';

export interface LookupRequest {
  word: string;
  context: string;
  source: VocabEntry['source'];
  anchor: { x: number; y: number };
}

interface WordLookupContextValue {
  open: (req: LookupRequest) => void;
}

const WordLookupContext = createContext<WordLookupContextValue | null>(null);

export function WordLookupProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<LookupRequest | null>(null);

  const open = (req: LookupRequest) => {
    noteLookup(req.source.materialId); // 閱讀能力的生詞密度統計
    setRequest(req);
  };

  return (
    <WordLookupContext.Provider value={{ open }}>
      {children}
      {request && <WordPopoverCard request={request} onClose={() => setRequest(null)} />}
    </WordLookupContext.Provider>
  );
}

export function useWordLookup(): WordLookupContextValue {
  const ctx = useContext(WordLookupContext);
  if (!ctx) throw new Error('useWordLookup must be used within WordLookupProvider');
  return ctx;
}
