import { PRESET_ARTICLES } from '../data/articles';
import * as storage from './storage';
import type { Article, CEFRLevel, MyArticle } from '../types';

export function getMyArticles(): MyArticle[] {
  return storage.get<MyArticle[]>('my_articles') ?? [];
}

export interface AddMyArticleInput {
  title: string;
  paragraphs: string[];
  level: CEFRLevel;
  topic?: string;
}

export function addMyArticle(input: AddMyArticleInput): MyArticle {
  const article: MyArticle = {
    id: `my-${crypto.randomUUID()}`,
    title: input.title,
    level: input.level,
    topic: input.topic ?? '自定义',
    paragraphs: input.paragraphs,
    createdAt: Date.now(),
    isCustom: true,
  };
  storage.set('my_articles', [article, ...getMyArticles()]);
  return article;
}

export function getAllArticles(): Article[] {
  return [...getMyArticles(), ...PRESET_ARTICLES];
}

export function getArticleById(id: string): Article | undefined {
  return getAllArticles().find((a) => a.id === id);
}

// Splits pasted free text into title + paragraphs with minimal friction:
// the first non-empty line becomes the title, the rest becomes paragraphs.
export function parsePastedText(raw: string): { title: string; paragraphs: string[] } {
  const blocks = raw
    .split(/\n{2,}/)
    .map((b) => b.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const title = (lines[0] ?? '我的文章').slice(0, 60);
    return { title, paragraphs: lines.length > 0 ? lines : [raw.trim()] };
  }

  const firstBlock = blocks[0];
  const title = firstBlock.length <= 80 && blocks.length > 1 ? firstBlock : firstBlock.slice(0, 60);
  const paragraphs = firstBlock.length <= 80 && blocks.length > 1 ? blocks.slice(1) : blocks;
  return { title, paragraphs };
}
