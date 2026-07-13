import { createElement, useRef, type ReactNode } from 'react';
import { useWordLookup } from '../context/WordLookupContext';
import type { VocabEntry } from '../types';

interface SelectableTextProps {
  context: string;
  source: VocabEntry['source'];
  className?: string;
  as?: 'span' | 'p';
  children?: ReactNode;
}

// Wraps a sentence/paragraph so the user can select a word or phrase inside
// it and get the §7 lookup popover. `context` is the plain-text sentence
// stored on the vocab entry; `children` (defaulting to `context`) is what
// actually renders, so callers can inject markup (e.g. vocab highlights)
// without changing what gets saved as the entry's context.
export default function SelectableText({ context, source, className, as = 'span', children }: SelectableTextProps) {
  const ref = useRef<HTMLElement>(null);
  const { open } = useWordLookup();

  const handleSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current) return;
    const anchorNode = sel.anchorNode;
    if (!anchorNode || !ref.current.contains(anchorNode)) return;
    const word = sel.toString().trim();
    if (!word) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    open({
      word,
      context,
      source,
      anchor: { x: rect.left + rect.width / 2, y: rect.bottom },
    });
  };

  return createElement(
    as,
    { ref, className, onMouseUp: handleSelection, onTouchEnd: handleSelection },
    children ?? context,
  );
}
