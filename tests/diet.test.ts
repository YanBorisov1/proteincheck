import { describe, expect, it } from 'vitest';
import { analyzeAllergens, normalizeAllergenTag } from '../src/analysis/allergens';
import { analyzeBlends } from '../src/analysis/blends';
import { analyzeProcessing, estimateNova } from '../src/analysis/processing';
import { flattenIngredients, parseIngredients } from '../src/analysis/text';
import { DEFAULT_PREFS } from '../src/analysis/types';
import { makeProduct } from './fixtures';

const parse = (s: string) => {
  const top = parseIngredients(s);
  return { top, flat: flattenIngredients(top) };
};

describe('allergens and diets', () => {
  it('normalises Open Food Facts tags', () => {
    expect(normalizeAllergenTag('en:soybeans')).toBe('soy');
    expect(normalizeAllergenTag('en:eggs')).toBe('egg');
    expect(normalizeAllergenTag('en:celery')).toBeUndefined();
  });

  it('detects allergens from ingredients and traces', () => {
    const { flat } = parse('whey protein, oats, almonds, soy lecithin, egg white');
    const r = analyzeAllergens(makeProduct({ tracesTags: ['en:peanuts'] }), flat);
    expect(r.contains).toEqual(['milk', 'soy', 'gluten', 'nuts', 'egg']);
    expect(r.mayContain).toEqual(['peanuts']);
    expect(r.vegan).toBe('no');
    expect(r.vegetarian).toBe('yes');
    expect(r.lactoseFree).toBe('no');
  });

  it('does not treat cocoa butter or coconut milk as dairy', () => {
    const { flat } = parse('cocoa butter, coconut milk, pea protein');
    const r = analyzeAllergens(makeProduct(), flat);
    expect(r.contains).toEqual([]);
    expect(r.vegan).toBe('yes');
  });

  it('marks gelatin and collagen as not vegetarian', () => {
    const r = analyzeAllergens(makeProduct(), parse('collagen peptides, gelatine').flat);
    expect(r.vegetarian).toBe('no');
    expect(r.vegan).toBe('no');
  });

  it('treats whey isolate as low-lactose ("maybe"), and labels win', () => {
    expect(analyzeAllergens(makeProduct(), parse('whey protein isolate').flat).lactoseFree).toBe('maybe');
    expect(analyzeAllergens(makeProduct({ labels: ['en:no-lactose'] }), parse('milk, lactase').flat).lactoseFree).toBe('yes');
  });

  it('adds personal warnings from dietary preferences', () => {
    const r = analyzeAllergens(makeProduct(), parse('whey, peanuts').flat, { ...DEFAULT_PREFS, vegan: true, nutFree: true });
    expect(r.findings.map((f) => f.code)).toEqual(['diet.notVegan', 'diet.containsNuts']);
  });

  it('flags "maybe" vegan items like vitamin D3', () => {
    const r = analyzeAllergens(makeProduct(), parse('pea protein, vitamin D3').flat, { ...DEFAULT_PREFS, vegan: true });
    expect(r.vegan).toBe('maybe');
    expect(r.findings[0]?.code).toBe('diet.notVeganMaybe');
  });
});

describe('processing', () => {
  it('estimates NOVA from ingredients', () => {
    const one = parse('pasteurised milk, live cultures');
    expect(estimateNova(one.top, one.flat).nova).toBe(1);
    const four = parse('whey protein isolate, cocoa, sucralose');
    expect(estimateNova(four.top, four.flat).nova).toBe(4);
    const three = parse('peanuts, dates, salt');
    expect(estimateNova(three.top, three.flat).nova).toBe(3);
  });

  it('prefers the Open Food Facts NOVA group and counts ingredients', () => {
    const p = parse('a, b, c');
    const r = analyzeProcessing(makeProduct({ novaGroup: 4 }), p.top, p.flat);
    expect(r).toMatchObject({ nova: 4, novaEstimated: false, ingredientCount: 3 });
  });
});

describe('blends', () => {
  it('flags undisclosed proprietary blends', () => {
    const r = analyzeBlends(parse('Proprietary blend (whey, glycine, taurine), cocoa').flat);
    expect(r.blends[0]).toMatchObject({ proprietary: true, disclosed: false });
    expect(r.findings[0]?.code).toBe('blend.proprietary');
  });

  it('accepts blends with disclosed amounts', () => {
    const r = analyzeBlends(parse('Protein blend (whey 60%, casein 40%), cocoa').flat);
    expect(r.blends[0]?.disclosed).toBe(true);
    expect(r.findings[0]?.code).toBe('blend.disclosed');
  });

  it('ignores vitamin complexes', () => {
    expect(analyzeBlends(parse('vitamin B complex').flat).blends).toEqual([]);
  });
});
