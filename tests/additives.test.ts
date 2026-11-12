import { describe, expect, it } from 'vitest';
import { ADDITIVES, analyzeAdditives, detectAdditives, getAdditive, lookupENumber } from '../src/analysis/additives';
import { flattenIngredients, parseIngredients } from '../src/analysis/text';

const flat = (s: string) => flattenIngredients(parseIngredients(s));

describe('additive database', () => {
  it('has at least 80 well-formed entries with unique ids', () => {
    expect(ADDITIVES.length).toBeGreaterThanOrEqual(80);
    const ids = new Set(ADDITIVES.map((a) => a.id));
    expect(ids.size).toBe(ADDITIVES.length);
    for (const a of ADDITIVES) {
      expect(['none', 'limited', 'moderate', 'high']).toContain(a.concern);
      expect(a.explanation.length).toBeGreaterThan(10);
      expect(a.source).toMatch(/^https:\/\//);
      expect(a.category.length).toBeGreaterThan(0);
    }
  });

  it('looks up E-numbers with and without letter suffixes', () => {
    expect(lookupENumber('322')?.name).toBe('Lecithins');
    expect(lookupENumber('160', 'a')?.id).toBe('E160a');
    expect(lookupENumber('160')?.id).toMatch(/^E160/);
    expect(lookupENumber('9999')).toBeUndefined();
    expect(getAdditive('e171')?.concern).toBe('high');
  });
});

describe('additive detection', () => {
  it('detects E-numbers in various spellings and by name', () => {
    const codes = detectAdditives(flat('emulsifier (E 322), e-471, thickener: xanthan gum, colour: titanium dioxide, E407')).map((a) => a.code);
    expect(codes).toEqual(['E322', 'E471', 'E415', 'E171', 'E407']);
  });

  it('prefers the longest synonym and does not double count', () => {
    const found = detectAdditives(flat('natural flavouring, soy lecithin, lecithin'));
    expect(found.map((a) => a.code)).toEqual(['natural-flavouring', 'E322']);
  });

  it('reports unknown E-numbers', () => {
    const r = analyzeAdditives(flat('E999'));
    expect(r.unknownCount).toBe(1);
    expect(r.additives[0]?.entry).toBeUndefined();
  });

  it('summarises by concern level', () => {
    const r = analyzeAdditives(flat('E171, E129, E322'));
    expect(r.countsByConcern).toEqual({ none: 1, limited: 0, moderate: 1, high: 1 });
    expect(r.findings.map((f) => f.code)).toEqual(['additives.high', 'additives.moderate']);
  });

  it('praises additive-free lists', () => {
    expect(analyzeAdditives(flat('milk, cultures')).findings[0]?.code).toBe('additives.none');
  });
});
