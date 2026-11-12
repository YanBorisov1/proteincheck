import { describe, expect, it } from 'vitest';
import { analyzeProduct } from '../src/analysis';
import { createT, detectLocale, hasKey, interpolate } from '../src/i18n';
import { collagenBar, greekYogurt, junkBar, makeProduct, veganBlend, wheyPowder } from './fixtures';
import { DEFAULT_PREFS } from '../src/analysis/types';

describe('i18n', () => {
  it('interpolates params and leaves unknown placeholders', () => {
    expect(interpolate('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });

  it('falls back to English for missing translations', () => {
    const t = createT('es');
    expect(t('nav.home')).toBe('Inicio');
    expect(t('results.disclaimer')).toMatch(/medical advice/);
  });

  it('detects the browser locale', () => {
    expect(detectLocale(['es-MX', 'en'])).toBe('es');
    expect(detectLocale(['xx'])).toBe('en');
  });

  it('has an English message for every finding and score reason the engine can produce', () => {
    const allPrefs = { ...DEFAULT_PREFS, vegan: true, lactoseFree: true, glutenFree: true, nutFree: true, soyFree: true, eggFree: true };
    const products = [wheyPowder, junkBar, collagenBar, greekYogurt, veganBlend, makeProduct(), makeProduct({ ingredientsText: 'Proprietary blend (glycine), E171, partially hydrogenated palm oil' })];
    for (const p of products) {
      const r = analyzeProduct(p, { prefs: allPrefs });
      for (const f of r.findings) expect(hasKey(`finding.${f.code}`), f.code).toBe(true);
      for (const s of r.score.subScores) {
        expect(hasKey(`subscore.${s.key}`)).toBe(true);
        for (const reason of s.reasons) expect(hasKey(`reason.${reason.code}`), reason.code).toBe(true);
      }
    }
  });
});

describe('i18n coverage (static)', () => {
  it('has a message for every finding code written in the analysis source', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dir = join(process.cwd(), 'src', 'analysis');
    const missing: string[] = [];
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'scoring.ts')) {
      const src = readFileSync(join(dir, file), 'utf8');
      for (const m of src.matchAll(/code: '([a-z]+\.[A-Za-z]+)'/g)) {
        const code = m[1] ?? '';
        if (!hasKey(`finding.${code}`)) missing.push(code);
        // Diet conflicts also produce "...Maybe" / "...Traces" variants.
        if (code.startsWith('diet.not') && !hasKey(`finding.${code}Maybe`)) missing.push(`${code}Maybe`);
        if (code.startsWith('diet.contains') && !hasKey(`finding.${code}Traces`)) missing.push(`${code}Traces`);
      }
    }
    expect(missing).toEqual([]);
  });
});
