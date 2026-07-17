import type { ReactNode } from 'react';

interface TaskCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  done?: boolean;
  secondary?: ReactNode;
  /** 0-1,任務卡計時進度條 */
  progress?: number;
  /** 目標時長等右側小字 */
  targetLabel?: string;
}

export default function TaskCard({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  done,
  secondary,
  progress,
  targetLabel,
}: TaskCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="font-medium text-gray-900">{title}</h2>
            {done && <span className="text-green-600">✓</span>}
            {targetLabel && <span className="ml-auto shrink-0 text-xs text-gray-400">{targetLabel}</span>}
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
      {progress !== undefined && !done && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
          />
        </div>
      )}
      {secondary && <div className="mt-2 pl-11">{secondary}</div>}
    </div>
  );
}
