import { cantonese } from './cantonese';
import { korean } from './korean';
import { french } from './french';
import type { PronLang } from './types';

export type { PronLang, PronGroup, PronItem } from './types';

export const PRON_LANGS: PronLang[] = [cantonese, korean, french];

export function getPronLang(id: string): PronLang | undefined {
  return PRON_LANGS.find((l) => l.id === id);
}
