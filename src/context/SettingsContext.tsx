import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import * as storage from '../lib/storage';
import { DEFAULT_WEIGHTS } from '../lib/planner';
import { DEFAULT_INTERESTS, type Settings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  deepseekApiKey: '',
  level: 'B1',
  interests: [...DEFAULT_INTERESTS],
  dailyNewCards: 15,
  plannerMinutes: 60,
  plannerWeights: { ...DEFAULT_WEIGHTS },
};

function loadSettings(): Settings {
  const stored = storage.get<Settings>('settings');
  if (!stored) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...stored };
}

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  hasApiKey: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      storage.set('settings', next);
      return next;
    });
  };

  const value = useMemo(
    () => ({ settings, updateSettings, hasApiKey: Boolean(settings.deepseekApiKey.trim()) }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
