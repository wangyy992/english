// 按課程語言分流聽力路由:粵語走 TTS 短對話,英語走原聽力。
import { getCourseLang } from '../../lib/lang';
import ListenList from './ListenList';
import ListenLesson from './ListenLesson';
import { CantoListenList, CantoListenLesson } from './CantoListen';

export function ListenListRoute() {
  return getCourseLang() === 'yue' ? <CantoListenList /> : <ListenList />;
}

export function ListenLessonRoute() {
  return getCourseLang() === 'yue' ? <CantoListenLesson /> : <ListenLesson />;
}
