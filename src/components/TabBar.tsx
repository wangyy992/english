import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: '今日', icon: '🏠', end: true },
  { to: '/listen', label: '听', icon: '🎧', end: false },
  { to: '/read', label: '读', icon: '📖', end: false },
  { to: '/write', label: '写', icon: '✍️', end: false },
  { to: '/vocab', label: '词', icon: '🗂️', end: false },
];

export default function TabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="主导航"
    >
      <div className="mx-auto flex max-w-lg">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'text-brand-600' : 'text-gray-400'
              }`
            }
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
