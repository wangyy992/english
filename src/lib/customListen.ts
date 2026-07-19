// 用戶自定義聽力課(粘貼音頻直鏈 + 瀏覽器內 Whisper 轉寫)。按課程語言隔離
// 存於 storage 'custom_listen'。
import * as storage from './storage';
import type { CantoLesson } from '../data/canto-listening';

export function getCustomLessons(): CantoLesson[] {
  return storage.get<CantoLesson[]>('custom_listen') ?? [];
}

export function saveCustomLesson(lesson: CantoLesson): void {
  const rest = getCustomLessons().filter((l) => l.id !== lesson.id);
  storage.set('custom_listen', [lesson, ...rest]);
}

export function deleteCustomLesson(id: string): void {
  storage.set('custom_listen', getCustomLessons().filter((l) => l.id !== id));
}
