import { createElement, useRef } from 'react';
import { useWordLookup } from '../context/WordLookupContext';
import type { VocabEntry } from '../types';

interface SelectableTextProps {
  text: string;
  source: VocabEntry['source'];
  className?: string;
  as?: 'span' | 'p';
}

// Wraps a sentence/paragraph so the user can select a word or phrase inside
// it and get the §7 lookup popover. `text` doubles as the vocab entry's
// `context` field when the selection is saved.
export default function SelectableText({ text, source, className, as = 'span' }: SelectableTextProps) {
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
      context: text,
      source,
      anchor: { x: rect.left + rect.width / 2, y: rect.bottom },
    });
  };

  return createElement(
    as,
    { ref, className, onMouseUp: handleSelection, onTouchEnd: handleSelection },
    text,
  );
}
