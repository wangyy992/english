export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Blanks the first occurrence of `term` inside `context`. Falls back to the
// untouched context if the term can't be matched verbatim (e.g. the vocab
// entry stored an inflected or multi-word form).
export function blankTerm(context: string, term: string): string {
  const pattern = new RegExp(escapeRegExp(term), 'i');
  return pattern.test(context) ? context.replace(pattern, '______') : context;
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
