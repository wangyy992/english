import { Link } from 'react-router-dom';

export default function WriteHome() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-gray-900">写作</h1>
      <div className="mt-4 space-y-3">
        <Link to="/write/translate" className="block rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-medium text-gray-900">翻译练习</h2>
          <p className="mt-1 text-sm text-gray-500">5 句中译英,AI 逐句批改</p>
        </Link>
        <Link to="/write/free" className="block rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-medium text-gray-900">自由写作</h2>
          <p className="mt-1 text-sm text-gray-500">选一个主题,写一篇短文</p>
        </Link>
      </div>
    </div>
  );
}
