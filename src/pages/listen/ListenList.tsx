import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllLessons } from '../../lib/lessons';
import * as progress from '../../lib/progress';

export default function ListenList() {
  const navigate = useNavigate();
  const lessons = getAllLessons();
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    setCompletedIds(progress.getProgress().completedLessonIds);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-gray-900">听力</h1>
      <div className="mt-4 space-y-2">
        {lessons.map((l) => (
          <button
            key={l.id}
            onClick={() => navigate(`/listen/${l.id}`)}
            className="block w-full rounded-xl bg-white p-3 text-left shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-gray-900">{l.title}</span>
              {completedIds.includes(l.id) && <span className="shrink-0 text-green-600">✓</span>}
            </div>
            <div className="mt-1 flex gap-2 text-xs text-gray-400">
              <span className="rounded-full bg-gray-100 px-2 py-0.5">{l.source}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">L{l.level}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
