import { en, type MessageKey } from './locales/en';
import { es } from './locales/es';
import type { Messages, Params, TFunction } from './types';

/**
 * To add a language: create locales/xx.ts exporting a `Messages` object,
 * then register it below. Untranslated keys fall back to English.
 */
export const LOCALES = {
  en: { name: 'English', messages: en as Messages },
  es: { name: 'Español', messages: es },
} as const;

export type LocaleCode = keyof typeof LOCALES;

export function isLocale(code: string): code is LocaleCode {
  return code in LOCALES;
}

/** Picks the best supported locale from the browser's preferences. */
export function detectLocale(languages: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages : []): LocaleCode {
  for (const lang of languages) {
    const base = lang.toLowerCase().split('-')[0] ?? '';
    if (isLocale(base)) return base;
  }
  return 'en';
}

export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

export function createT(locale: LocaleCode): TFunction {
  const messages = LOCALES[locale].messages;
  const fallback = en as Record<string, string>;
  return (key, params) => {
    const template = (messages as Record<string, string | undefined>)[key] ?? fallback[key] ?? key;
    return interpolate(template, params);
  };
}

export function hasKey(key: string): key is MessageKey {
  return key in en;
}

export type { MessageKey, TFunction };
