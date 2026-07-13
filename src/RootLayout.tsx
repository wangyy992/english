import { NavLink, Outlet } from 'react-router-dom';
import TabBar from './components/TabBar';

export default function RootLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-gray-50">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold tracking-wide text-gray-400">四技</span>
        <NavLink
          to="/settings"
          className={({ isActive }) => `text-lg ${isActive ? 'text-brand-600' : 'text-gray-400'}`}
          aria-label="设置"
        >
          ⚙️
        </NavLink>
      </header>
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
