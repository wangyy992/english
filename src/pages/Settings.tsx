import { useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { testConnection } from '../lib/deepseek';
import * as storage from '../lib/storage';
import * as vocab from '../lib/vocab';
import { MODULE_LABEL, PLAN_MODULES } from '../lib/planner';
import { ACHIEVEMENTS, getRewards } from '../lib/rewards';
import { getMonthAzureSeconds, testAzureConnection } from '../lib/speech';
import ConfirmDialog from '../components/ConfirmDialog';
import type { CEFRLevel } from '../types';

const LEVELS: CEFRLevel[] = ['A2', 'B1', 'B2', 'C1'];

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const [keyDraft, setKeyDraft] = useState(settings.deepseekApiKey);
  const [testState, setTestState] = useState<{ status: 'idle' | 'loading' | 'done'; ok?: boolean; message?: string }>({
    status: 'idle',
  });
  const [azureRegionDraft, setAzureRegionDraft] = useState(settings.azureRegion);
  const [azureKeyDraft, setAzureKeyDraft] = useState(settings.azureKey);
  const [azureTest, setAzureTest] = useState<{ status: 'idle' | 'loading' | 'done'; ok?: boolean; message?: string }>({
    status: 'idle',
  });
  const [newTag, setNewTag] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const rewardsData = getRewards();

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

  const saveAzure = () => {
    updateSettings({ azureRegion: azureRegionDraft.trim(), azureKey: azureKeyDraft.trim() });
  };

  const handleAzureTest = async () => {
    const region = azureRegionDraft.trim();
    const key = azureKeyDraft.trim();
    if (!region || !key) {
      setAzureTest({ status: 'done', ok: false, message: '请先填入 Region 和 Key' });
      return;
    }
    setAzureTest({ status: 'loading' });
    saveAzure();
    const result = await testAzureConnection(region, key);
    setAzureTest({ status: 'done', ok: result.ok, message: result.message });
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

  const handleExportVocabCsv = () => {
    const csv = vocab.toCsv(vocab.getAll());
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siji-vocab-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <h2 className="text-sm font-semibold text-gray-900">Azure 语音服务</h2>
        <p className="mt-1 text-xs text-gray-500">
          用于跟读音素级发音评分与复述转写。不填则用浏览器基础模式(仅词级对/错,无分数)。
        </p>
        <input
          value={azureRegionDraft}
          onChange={(e) => setAzureRegionDraft(e.target.value)}
          onBlur={saveAzure}
          placeholder="Region,如 eastasia"
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          autoComplete="off"
        />
        <input
          type="password"
          value={azureKeyDraft}
          onChange={(e) => setAzureKeyDraft(e.target.value)}
          onBlur={saveAzure}
          placeholder="Key"
          className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          autoComplete="off"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleAzureTest}
            disabled={azureTest.status === 'loading'}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {azureTest.status === 'loading' ? '测试中…' : '测试连接'}
          </button>
          {azureTest.status === 'done' && (
            <span className={`text-sm ${azureTest.ok ? 'text-green-600' : 'text-red-600'}`}>{azureTest.message}</span>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-400">本月估算用量:{Math.round(getMonthAzureSeconds() / 60)} 分钟(按呼叫时长本地累计)</p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">今日任务权重</h2>
        <p className="mt-1 text-xs text-gray-500">学习总时长按以下相对权重分配到五个模块。</p>
        <div className="mt-3 space-y-2">
          {PLAN_MODULES.map((m) => (
            <label key={m} className="flex items-center justify-between text-sm text-gray-700">
              {MODULE_LABEL[m]}
              <input
                type="number"
                min={0}
                max={100}
                value={settings.plannerWeights[m]}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  updateSettings({
                    plannerWeights: { ...settings.plannerWeights, [m]: Math.max(0, Math.min(100, Math.round(n))) },
                    plannerWeightsCustom: true,
                  });
                }}
                className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-center text-sm"
              />
            </label>
          ))}
        </div>
        {settings.plannerWeightsCustom && (
          <button
            onClick={() => updateSettings({ plannerWeightsCustom: false })}
            className="mt-3 text-xs text-brand-600 underline"
          >
            恢复自动权重(按弱项动态加成)
          </button>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">严格度</h2>
        <p className="mt-1 text-xs text-gray-500">
          温和:未完成仅提示,连续 3 日未达标自动下调目标。硬核:欠账滚入次日(封顶 +50%)+ 醒目提醒。
        </p>
        <div className="mt-3 flex gap-2">
          {(['gentle', 'hardcore'] as const).map((s) => (
            <button
              key={s}
              onClick={() => updateSettings({ strictness: s })}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                settings.strictness === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {s === 'gentle' ? '温和' : '硬核'}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">积分与成就</h2>
        <p className="mt-2 text-sm text-gray-700">⭐ {rewardsData.points} 分</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = rewardsData.achievements.some((x) => x.id === a.id);
            return (
              <span
                key={a.id}
                className={`rounded-full px-3 py-1 text-xs ${
                  unlocked ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {unlocked ? '🏅 ' : '🔒 '}
                {a.label}
              </span>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">复习</h2>
        <label className="mt-3 flex items-center justify-between text-sm text-gray-700">
          每日新卡上限
          <input
            type="number"
            min={0}
            max={100}
            value={settings.dailyNewCards}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) updateSettings({ dailyNewCards: Math.max(0, Math.min(100, Math.round(n))) });
            }}
            className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-center text-sm"
          />
        </label>
        <p className="mt-2 text-xs text-gray-500">复习间隔由 FSRS 算法自动安排,新卡超出上限的部分留到之后再学。</p>
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
            onClick={handleExportVocabCsv}
            className="rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700"
          >
            导出生词本 CSV
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
