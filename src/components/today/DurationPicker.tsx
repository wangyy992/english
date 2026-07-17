import { useState } from 'react';

const PRESETS = [
  { minutes: 30, label: '30 分钟' },
  { minutes: 60, label: '1 小时' },
  { minutes: 120, label: '2 小时' },
  { minutes: 180, label: '3 小时' },
];

export default function DurationPicker({
  defaultMinutes,
  streak,
  onStart,
}: {
  defaultMinutes: number;
  streak: number;
  onStart: (minutes: number) => void;
}) {
  const isPreset = PRESETS.some((p) => p.minutes === defaultMinutes);
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [custom, setCustom] = useState(!isPreset);
  const [customDraft, setCustomDraft] = useState(String(defaultMinutes));

  const effective = custom ? Math.max(5, Math.min(600, Math.round(Number(customDraft) || 0))) : minutes;

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">今日</h1>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>🔥</span>
          <span>连续打卡 {streak} 天</span>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">今天能学多久?</p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.minutes}
            onClick={() => {
              setCustom(false);
              setMinutes(p.minutes);
            }}
            className={`rounded-xl py-3 text-sm font-medium ${
              !custom && minutes === p.minutes ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 shadow-sm'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setCustom(true)}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
            custom ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 shadow-sm'
          }`}
        >
          自定义
        </button>
        {custom && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="number"
              min={5}
              max={600}
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-center text-sm"
            />
            分钟
          </label>
        )}
      </div>

      <button
        onClick={() => onStart(effective)}
        className="mt-8 w-full rounded-2xl bg-brand-600 py-4 text-base font-semibold text-white"
      >
        开始今日学习({effective >= 60 ? `${Math.floor(effective / 60)} 小时${effective % 60 ? ` ${effective % 60} 分钟` : ''}` : `${effective} 分钟`})
      </button>
    </div>
  );
}
