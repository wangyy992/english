// 統一的線性圖標(stroke currentColor),替代 emoji,保持設計一致。
import type { ReactNode } from 'react';

function Svg({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
    </Svg>
  );
}

export function ListenIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
    </Svg>
  );
}

export function SpeakIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </Svg>
  );
}

export function ReadIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M12 6c-1.5-1.4-3.6-2-6-2-1 0-2 .1-3 .4V19c1-.3 2-.4 3-.4 2.4 0 4.5.6 6 2 1.5-1.4 3.6-2 6-2 1 0 2 .1 3 .4V4.4c-1-.3-2-.4-3-.4-2.4 0-4.5.6-6 2Z" />
      <path d="M12 6v14.6" />
    </Svg>
  );
}

export function WriteIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="m15 5 4 4L8 20H4v-4L15 5Z" />
      <path d="m13 7 4 4" />
    </Svg>
  );
}

export function VocabIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="4" y="7" width="13" height="13" rx="2" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4H19a1.5 1.5 0 0 1 1.5 1.5V15a1.5 1.5 0 0 1-1.5 1.5H17" />
      <path d="m7.5 15 3-6 3 6M8.6 13h3.8" />
    </Svg>
  );
}

export function DialogueIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M3 6h13a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8l-5 4V8a2 2 0 0 1 2-2Z" />
      <path d="M21 10v10l-3-2" />
    </Svg>
  );
}

export function GradIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="m12 4 10 5-10 5L2 9l10-5Z" />
      <path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    </Svg>
  );
}

/** 頂欄小知更鳥 */
export function RobinMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M8 30 Q18 27 25 31 L21 40 Q13 38 8 30 Z" fill="#6D5B4B" />
      <path d="M18 35 C18 23 28 15 40 15 C50 15 57 22 57 30 C57 43 46 52 34 52 C24 52 18 45 18 35 Z" fill="#7E6A58" />
      <path d="M29 49 C23 43 24 31 32 24 C38 18.5 46 19 50 25 C52.5 29 52 34 49 39 C44.5 46.5 35.5 51.5 29 49 Z" fill="#C9542E" />
      <circle cx="45.5" cy="25.5" r="2" fill="#26201A" />
      <path d="M55 26.5 L62 29.5 L54.5 31.5 Z" fill="#3E342B" />
    </svg>
  );
}
