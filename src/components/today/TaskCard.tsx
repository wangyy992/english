import type { ReactNode } from 'react';

interface TaskCardProps {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  done?: boolean;
  secondary?: ReactNode;
}

export default function TaskCard({ icon, title, subtitle, actionLabel, onAction, done, secondary }: TaskCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="font-medium text-gray-900">{title}</h2>
            {done && <span className="text-green-600">✓</span>}
          </div>
          <p className="truncate text-sm text-gray-500">{subtitle}</p>
        </div>
        <button
          onClick={onAction}
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          {actionLabel}
        </button>
      </div>
      {secondary && <div className="mt-2 pl-11">{secondary}</div>}
    </div>
  );
}
