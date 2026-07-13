import { useState } from 'react';
import { buildErrorSegments } from '../../lib/errorSegments';
import type { TranslationResult } from '../../types';

export default function GradedAnswer({ text, errors }: { text: string; errors: TranslationResult['errors'] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const segments = buildErrorSegments(text, errors);

  return (
    <div>
      <p className="text-sm leading-relaxed text-gray-800">
        {segments.map((seg, i) =>
          seg.errorIndex === null ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <span
              key={i}
              onClick={() => setActiveIndex(activeIndex === seg.errorIndex ? null : seg.errorIndex)}
              className="cursor-pointer text-red-600 underline decoration-red-400 decoration-2 underline-offset-2"
            >
              {seg.text}
            </span>
          ),
        )}
      </p>
      {activeIndex !== null && errors[activeIndex] && (
        <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          <p>
            <span className="font-medium">{errors[activeIndex].type}</span> · 建议改为「{errors[activeIndex].suggestion}」
          </p>
          <p className="mt-1 text-red-600">{errors[activeIndex].explanation}</p>
        </div>
      )}
    </div>
  );
}
