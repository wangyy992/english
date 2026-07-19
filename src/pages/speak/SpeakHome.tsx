import { useNavigate } from 'react-router-dom';
import { DialogueIcon, GradIcon, ListenIcon } from '../../components/icons';
import type { ReactNode } from 'react';

const ENTRIES: { to: string; icon: ReactNode; title: string; desc: string }[] = [
  { to: '/listen', icon: <ListenIcon />, title: '跟读', desc: '进入听力材料的跟读阶段,逐句发音评分' },
  { to: '/speak/dialogue', icon: <DialogueIcon />, title: '情景对话', desc: '点餐 / 面试 / 机场等场景,AI 扮演对方' },
  { to: '/speak/ielts', icon: <GradIcon />, title: '雅思口语模拟', desc: 'Part 1/2/3 仿真题,四维评分' },
];

export default function SpeakHome() {
  const navigate = useNavigate();
  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">说</h1>
      <div className="mt-4 space-y-3">
        {ENTRIES.map((e) => (
          <button
            key={e.to}
            onClick={() => navigate(e.to)}
            className="flex w-full items-center gap-3 rounded-2xl border border-gray-200/70 bg-white p-4 text-left shadow-card"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              {e.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-gray-900">{e.title}</span>
              <span className="block truncate text-sm text-gray-500">{e.desc}</span>
            </span>
            <span className="text-gray-300">▸</span>
          </button>
        ))}
      </div>
    </div>
  );
}
