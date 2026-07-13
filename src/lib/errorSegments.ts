import type { TranslationResult } from '../types';

export interface ErrorSegment {
  text: string;
  errorIndex: number | null;
}

// Splits `text` into segments so each occurrence of an error's `original`
// substring can be underlined and tied back to its explanation.
export function buildErrorSegments(text: string, errors: TranslationResult['errors']): ErrorSegment[] {
  if (errors.length === 0) return [{ text, errorIndex: null }];

  const marks: { start: number; end: number; errorIndex: number }[] = [];
  errors.forEach((err, idx) => {
    if (!err.original) return;
    const pos = text.toLowerCase().indexOf(err.original.toLowerCase());
    if (pos !== -1) marks.push({ start: pos, end: pos + err.original.length, errorIndex: idx });
  });
  marks.sort((a, b) => a.start - b.start);

  const filtered: typeof marks = [];
  let lastEnd = -1;
  for (const m of marks) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  if (filtered.length === 0) return [{ text, errorIndex: null }];

  const segments: ErrorSegment[] = [];
  let cursor = 0;
  for (const m of filtered) {
    if (m.start > cursor) segments.push({ text: text.slice(cursor, m.start), errorIndex: null });
    segments.push({ text: text.slice(m.start, m.end), errorIndex: m.errorIndex });
    cursor = m.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), errorIndex: null });
  return segments;
}
