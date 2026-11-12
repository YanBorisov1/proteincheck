import { describe, expect, it } from 'vitest';
import { checkProteinClaim, detectProteinClaim } from '../src/analysis/claims';
import { energyKcal } from '../src/analysis/nutrition';
import { analyzeProteinDensity } from '../src/analysis/protein';
import { junkBar, makeProduct, wheyPowder } from './fixtures';

describe('energy', () => {
  it('uses the label value when present', () => {
    expect(energyKcal({ energyKcal100g: 400 })).toEqual({ kcal100g: 400, estimated: false });
  });
  it('estimates from macros with EU factors when missing', () => {
    // 20*4 + (50-10)*4 + 10*2.4 + 10*9 + 5*2 = 80+160+24+90+10 = 364
    expect(energyKcal({ proteins100g: 20, carbohydrates100g: 50, polyols100g: 10, fat100g: 10, fiber100g: 5 })).toEqual({
      kcal100g: 364,
      estimated: true,
    });
  });
  it('gives up when macros are missing', () => {
    expect(energyKcal({ proteins100g: 20 })).toEqual({ estimated: true });
  });
});

describe('protein density', () => {
  it('computes per 100 g, per serving, per 100 kcal and % energy', () => {
    const d = analyzeProteinDensity(wheyPowder);
    expect(d.per100g).toBe(78);
    expect(d.perServing).toBe(23.4);
    expect(d.per100kcal).toBe(20.5);
    expect(d.energyPct).toBe(82);
    expect(d.findings.map((f) => f.code)).toContain('protein.veryDense');
  });
  it('flags low density', () => {
    const d = analyzeProteinDensity(junkBar);
    expect(d.energyPct).toBe(10);
    expect(d.findings[0]?.code).toBe('protein.lowDensity');
  });
  it('handles missing protein', () => {
    const d = analyzeProteinDensity(makeProduct());
    expect(d.per100g).toBeUndefined();
    expect(d.findings[0]?.code).toBe('protein.missing');
  });
});

describe('protein claims (EU 1924/2006)', () => {
  it('detects claim strength from name, labels and categories', () => {
    expect(detectProteinClaim(makeProduct({ labels: ['en:high-proteins'] }))).toBe('high');
    expect(detectProteinClaim(makeProduct({ name: 'Cereal, source of protein' }))).toBe('source');
    expect(detectProteinClaim(makeProduct({ name: 'Choco Protein Bar' }))).toBe('implied');
    expect(detectProteinClaim(makeProduct({ name: 'Muesli', categories: ['en:protein-bars'] }))).toBe('implied');
    expect(detectProteinClaim(makeProduct({ name: 'Oat biscuits' }))).toBe('none');
  });

  it('applies the 12% and 20% thresholds exactly', () => {
    const high = makeProduct({ labels: ['high protein'] });
    expect(checkProteinClaim(high, 20).status).toBe('meets');
    expect(checkProteinClaim(high, 19).status).toBe('partial');
    expect(checkProteinClaim(high, 11).status).toBe('fails');
    const source = makeProduct({ name: 'Source of protein crackers' });
    expect(checkProteinClaim(source, 12).status).toBe('meets');
    expect(checkProteinClaim(source, 11.9).status).toBe('fails');
  });

  it('flags implied protein products that do not qualify', () => {
    const c = checkProteinClaim(junkBar, 10);
    expect(c.status).toBe('fails');
    expect(c.findings[0]).toMatchObject({ code: 'claim.impliedFails', severity: 'bad' });
  });

  it('returns unknown when energy share cannot be computed', () => {
    expect(checkProteinClaim(junkBar, undefined).status).toBe('unknown');
  });
});
