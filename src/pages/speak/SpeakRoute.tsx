// 按課程語言分流「說」路由:粵語走情景對話,英語走跟讀/對話/雅思樞紐。
import { getCourseLang } from '../../lib/lang';
import SpeakHome from './SpeakHome';
import CantoSpeak from './CantoSpeak';

export default function SpeakRoute() {
  return getCourseLang() === 'yue' ? <CantoSpeak /> : <SpeakHome />;
}
