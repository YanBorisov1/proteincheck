import type { TFunction } from '../i18n';
import type { Finding } from '../analysis/types';

export function formatEnergy(kcal: number | undefined, unit: 'kcal' | 'kj', n: (v: number, d?: number) => string): string {
  if (kcal === undefined) return '—';
  return unit === 'kj' ? `${n(kcal * 4.184, 0)} kJ` : `${n(kcal, 0)} kcal`;
}

export function formatGrams(g: number | undefined, n: (v: number, d?: number) => string, digits = 1): string {
  return g === undefined ? '—' : `${n(g, digits)} g`;
}

export function formatMoney(value: number | undefined, currency: string, locale: string): string {
  if (value === undefined) return '—';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

/** Translates a finding, localising protein-source ids in its params. */
export function findingText(t: TFunction, f: Finding): string {
  const params = { ...(f.params ?? {}) };
  if (typeof params.source === 'string') params.source = t(`source.${params.source}`);
  return t(`finding.${f.code}`, params);
}

export function parseNumberInput(value: string): number | undefined {
  const v = value.trim().replace(',', '.');
  if (v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
