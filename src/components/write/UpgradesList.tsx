import { useState } from 'react';
import * as vocab from '../../lib/vocab';
import type { TranslationResult } from '../../types';

export default function UpgradesList({
  upgrades,
  context,
  materialId,
}: {
  upgrades: TranslationResult['upgrades'];
  context: string;
  materialId: string;
}) {
  const [added, setAdded] = useState<Set<number>>(new Set());

  if (upgrades.length === 0) return null;

  const handleAdd = (i: number) => {
    vocab.addEntry({
      term: upgrades[i].phrase,
      context,
      source: { module: 'write', materialId },
    });
    setAdded((prev) => new Set(prev).add(i));
  };

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs font-medium text-gray-400">值得学的表达</p>
      {upgrades.map((u, i) => (
        <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-brand-50 p-2">
          <div className="min-w-0">
            <span className="text-sm font-medium text-brand-700">{u.phrase}</span>
            <p className="text-xs text-gray-500">{u.note}</p>
          </div>
          <button
            onClick={() => handleAdd(i)}
            disabled={added.has(i)}
            className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-medium text-brand-600 disabled:opacity-40"
          >
            ＋生词本
          </button>
        </div>
      ))}
    </div>
  );
}
