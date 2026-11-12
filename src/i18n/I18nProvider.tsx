import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createT, type LocaleCode, type TFunction } from './index';

interface I18nValue {
  locale: LocaleCode;
  t: TFunction;
  /** Locale-aware number formatting. */
  n: (value: number, digits?: number) => string;
  d: (timestamp: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: LocaleCode; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const t = createT(locale);
    return {
      locale,
      t,
      n: (v, digits = 1) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(v),
      d: (ts) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(ts)),
    };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
