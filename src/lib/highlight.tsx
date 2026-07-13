import { Fragment } from 'react';
import { escapeRegExp } from './text';

// Wraps every occurrence of a vocab term in `text` with a highlight mark.
// Returns the original string when there's nothing to highlight.
export function highlightVocabTerms(text: string, terms: string[]) {
  if (terms.length === 0) return text;
  const pattern = new RegExp(`(${[...terms].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-yellow-100 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
