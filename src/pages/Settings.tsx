import { useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { testConnection } from '../lib/deepseek';
import * as storage from '../lib/storage';
import ConfirmDialog from '../components/ConfirmDialog';
import type { CEFRLevel } from '../types';

const LEVELS: CEFRLevel[] = ['A2', 'B1', 'B2', 'C1'];

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const [keyDraft, setKeyDraft] = useState(settings.deepseekApiKey);
  const [testState, setTestState] = useState<{ status: 'idle' | 'loading' | 'done'; ok?: boolean; message?: string }>({
    status: 'idle',
  });
  const [newTag, setNewTag] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const saveKey = () => {
    updateSettings({ deepseekApiKey: keyDraft.trim() });
  };

  const handleTest = async () => {
    const key = keyDraft.trim();
    if (!key) {
      setTestState({ status: 'done', ok: false, message: '请先输入 API Key' });
      return;
    }
    setTestState({ status: 'loading' });
    saveKey();
    const result = await testConnection(key);
    setTestState({ status: 'done', ok: result.ok, message: result.message });
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (!tag || settings.interests.includes(tag)) {
      setNewTag('');
      return;
    }
    updateSettings({ interests: [...settings.interests, tag] });
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    updateSettings({ interests: settings.interests.filter((t) => t !== tag) });
  };

  const handleExport = () => {
    const data = storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siji-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Record<string, unknown>;
      storage.importAll(data);
      setImportMessage('导入成功,刷新后生效');
    } catch {
      setImportMessage('导入失败:文件格式不正确');
    }
  };

  const handleClear = () => {
    storage.clearAll();
    setConfirmClear(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6 p-4 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">设置</h1>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">DeepSeek API Key</h2>
        <p className="mt-1 text-xs text-gray-500">
          用于翻译批改、自由写作、中文释义等 AI 功能。不填也可正常使用听力、阅读与生词本。
        </p>
        <input
          type="password"
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
          onBlur={saveKey}
          placeholder="sk-..."
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          autoComplete="off"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testState.status === 'loading'}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {testState.status === 'loading' ? '测试中…' : '测试连接'}
          </button>
          {testState.status === 'done' && (
            <span className={`text-sm ${testState.ok ? 'text-green-600' : 'text-red-600'}`}>
              {testState.message}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">难度偏好</h2>
        <div className="mt-3 flex gap-2">
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => updateSettings({ level })}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                settings.level === level ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">兴趣标签</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.interests.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="text-brand-400" aria-label={`删除标签 ${tag}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="添加标签"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button onClick={addTag} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
            添加
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">数据</h2>
        <div className="mt-3 flex flex-col gap-2">
          <button
            onClick={handleExport}
            className="rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700"
          >
            导出全部数据 JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700"
          >
            导入数据
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }}
          />
          {importMessage && <p className="text-xs text-gray-500">{importMessage}</p>}
          <button
            onClick={() => setConfirmClear(true)}
            className="rounded-xl bg-red-50 py-2.5 text-sm font-medium text-red-600"
          >
            清空全部数据
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmClear}
        title="清空全部数据?"
        description="生词本、学习记录、写作缓存等将被永久删除,且无法恢复。"
        confirmLabel="清空"
        danger
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
