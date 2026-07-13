import { formatTime } from '../../lib/text';

interface AudioPlayerProps {
  playing: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onRateChange: (rate: number) => void;
}

export default function AudioPlayer({
  playing,
  currentTime,
  duration,
  rate,
  onTogglePlay,
  onSeek,
  onRateChange,
}: AudioPlayerProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          aria-label={playing ? '暂停' : '播放'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg text-white"
        >
          {playing ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="flex-1 accent-brand-600"
        />
        <div className="flex gap-1">
          {[0.75, 1].map((r) => (
            <button
              key={r}
              onClick={() => onRateChange(r)}
              className={`rounded-lg px-2 py-1 text-xs font-medium ${
                rate === r ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {r}×
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 text-right text-xs text-gray-400">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
}
