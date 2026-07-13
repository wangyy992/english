import { LESSONS } from '../data/lessons';
import type { AudioLesson } from '../types';

export function getAllLessons(): AudioLesson[] {
  return LESSONS;
}

export function getLessonById(id: string): AudioLesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
