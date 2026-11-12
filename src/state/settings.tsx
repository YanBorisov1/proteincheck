import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PREFS, type DietaryPrefs } from '../analysis/types';
import { detectLocale, isLocale, type LocaleCode } from '../i18n';
import { safeStorage } from '../utils/storage';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  language: LocaleCode;
  energyUnit: 'kcal' | 'kj';
  saltUnit: 'salt' | 'sodium';
  currency: string;
  theme: Theme;
  prefs: DietaryPrefs;
}

const KEY = 'proteincheck.settings';

export function defaultSettings(): Settings {
  return { language: detectLocale(), energyUnit: 'kcal', saltUnit: 'salt', currency: 'EUR', theme: 'system', prefs: { ...DEFAULT_PREFS } };
}

export function loadSettings(): Settings {
  const base = defaultSettings();
  const raw = safeStorage.get(KEY);
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      language: typeof parsed.language === 'string' && isLocale(parsed.language) ? parsed.language : base.language,
      energyUnit: parsed.energyUnit === 'kj' ? 'kj' : 'kcal',
      saltUnit: parsed.saltUnit === 'sodium' ? 'sodium' : 'salt',
      currency: typeof parsed.currency === 'string' && /^[A-Z]{3}$/.test(parsed.currency) ? parsed.currency : base.currency,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system',
      prefs: { ...DEFAULT_PREFS, ...(parsed.prefs ?? {}) },
    };
  } catch {
    return base;
  }
}

interface SettingsValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', Boolean(dark));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1220' : '#0f766e');
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      safeStorage.set(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq?.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
