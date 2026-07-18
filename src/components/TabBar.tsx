import { NavLink } from 'react-router-dom';
import { HomeIcon, ListenIcon, ReadIcon, SpeakIcon, VocabIcon, WriteIcon } from './icons';
import { getCourseLang } from '../lib/lang';
import type { ReactNode } from 'react';

interface Tab {
  to: string;
  label: string;
  icon: ReactNode;
  end: boolean;
}

// 英語:完整聽說讀寫詞。其他語言:詞彙 + 發音課程,只顯示有內容的 tab。
const FULL_TABS: Tab[] = [
  { to: '/', label: '今日', icon: <HomeIcon />, end: true },
  { to: '/listen', label: '听', icon: <ListenIcon />, end: false },
  { to: '/speak', label: '说', icon: <SpeakIcon />, end: false },
  { to: '/read', label: '读', icon: <ReadIcon />, end: false },
  { to: '/write', label: '写', icon: <WriteIcon />, end: false },
  { to: '/vocab', label: '词', icon: <VocabIcon />, end: false },
];

const COURSE_TABS: Tab[] = [
  { to: '/', label: '今日', icon: <HomeIcon />, end: true },
  { to: '/pronounce', label: '发音', icon: <SpeakIcon />, end: false },
  { to: '/vocab', label: '词', icon: <VocabIcon />, end: false },
];

export default function TabBar() {
  const tabs = getCourseLang() === 'en' ? FULL_TABS : COURSE_TABS;
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="主导航"
    >
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${
                isActive ? 'font-medium text-brand-600' : 'text-gray-400'
              }`
            }
          >
            {tab.icon}
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
