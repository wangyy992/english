import { LESSONS } from '../data/lessons';
import type { AudioLesson } from '../types';

// Remote lessons are produced daily by .github/workflows/fetch-lessons.yml
// (podcast RSS + whisper alignment) and published as a static JSON asset
// alongside the app. Built-in lessons remain as an offline fallback.
let remoteLessons: AudioLesson[] | null = null;
let remoteFetch: Promise<AudioLesson[]> | null = null;

async function fetchRemoteLessons(): Promise<AudioLesson[]> {
  try {
    const res = await fetch('./data/lessons.json');
    if (!res.ok) return [];
    const data = (await res.json()) as AudioLesson[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function loadAllLessons(): Promise<AudioLesson[]> {
  if (remoteLessons === null) {
    remoteFetch ??= fetchRemoteLessons();
    remoteLessons = await remoteFetch;
  }
  return [...remoteLessons, ...LESSONS];
}

// Synchronous view of whatever is known right now (built-ins always, plus
// remote lessons once loadAllLessons has resolved at least once).
export function getAllLessons(): AudioLesson[] {
  return [...(remoteLessons ?? []), ...LESSONS];
}

export function getLessonById(id: string): AudioLesson | undefined {
  return getAllLessons().find((l) => l.id === id);
}
