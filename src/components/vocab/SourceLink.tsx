import { Link } from 'react-router-dom';
import type { VocabEntry } from '../../types';

const MODULE_LABEL: Record<VocabEntry['source']['module'], string> = {
  listen: '听力',
  read: '阅读',
  write: '写作',
  wordbook: '词书',
  dict: '查词',
};

export default function SourceLink({ source }: { source: VocabEntry['source'] }) {
  const label = MODULE_LABEL[source.module];
  if (source.module === 'write' || source.module === 'wordbook' || source.module === 'dict') {
    return <p className="mt-3 text-xs text-gray-400">来自{label}</p>;
  }
  const to = source.module === 'listen' ? `/listen/${source.materialId}` : `/read/${source.materialId}`;
  return (
    <Link to={to} className="mt-3 inline-block text-xs font-medium text-brand-600 underline">
      查看来源({label})
    </Link>
  );
}
