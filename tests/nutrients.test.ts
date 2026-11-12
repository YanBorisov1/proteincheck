import { describe, expect, it } from 'vitest';
import { analyzeFats } from '../src/analysis/fats';
import { analyzeFillers } from '../src/analysis/fillers';
import { analyzeSalt } from '../src/analysis/sodium';
import { analyzeSugars } from '../src/analysis/sugars';
import { flattenIngredients, parseIngredients } from '../src/analysis/text';
import { analyzeValue, costPer30gProtein } from '../src/analysis/value';
import { makeProduct } from './fixtures';

const flat = (s: string) => flattenIngredients(parseIngredients(s));

describe('sugars and sweeteners', () => {
  it('computes the sugar-to-protein ratio and flags more sugar than protein', () => {
    const r = analyzeSugars({ sugars100g: 30, proteins100g: 10 }, []);
    expect(r.sugarToProtein).toBe(3);
    expect(r.findings.map((f) => f.code)).toEqual(['sugar.high', 'sugar.moreSugarThanProtein']);
  });

  it('lists added sugars, polyols and intense sweeteners', () => {
    const r = analyzeSugars(
      { sugars100g: 8, proteins100g: 30, polyols100g: 12 },
      flat('whey, glucose syrup, dextrose, honey, maltitol, erythritol, sucralose, acesulfame K'),
    );
    expect(r.addedSugarIngredients).toEqual(['glucose syrup', 'dextrose', 'honey']);
    expect(r.sugarAlcohols.map((s) => s.id)).toEqual(['maltitol', 'erythritol']);
    expect(r.sweeteners.map((s) => s.id)).toEqual(['sucralose', 'acesulfame']);
    const codes = r.findings.map((f) => f.code);
    expect(codes).toContain('sugar.manyTypes');
    expect(codes).toContain('sugar.maltitol');
    expect(codes).toContain('sugar.sweeteners');
  });

  it('flags sugar as a top ingredient only at the top level', () => {
    expect(analyzeSugars({}, flat('sugar, whey')).findings.map((f) => f.code)).toContain('sugar.topIngredient');
    expect(analyzeSugars({}, flat('coating (sugar, cocoa), whey, oats')).findings.map((f) => f.code)).not.toContain('sugar.topIngredient');
  });

  it('does not count "sugar alcohol" or sugar-free mentions as sugar', () => {
    expect(analyzeSugars({}, flat('sugar alcohol (maltitol)')).addedSugarIngredients).toEqual([]);
  });
});

describe('fats', () => {
  it('detects palm and partially hydrogenated fat', () => {
    const r = analyzeFats({ saturatedFat100g: 9 }, flat('palm kernel oil, partially hydrogenated soybean oil'), 'palm kernel oil, partially hydrogenated soybean oil');
    expect(r.palm).toBe(true);
    expect(r.partiallyHydrogenated).toBe(true);
    expect(r.findings.map((f) => f.code)).toEqual(['fat.satHigh', 'fat.partiallyHydrogenated', 'fat.palm']);
  });

  it('respects "palm oil free"', () => {
    expect(analyzeFats({}, flat('sunflower oil'), 'sunflower oil. Palm oil free').palm).toBe(false);
  });
});

describe('fillers and fibre', () => {
  it('flags early maltodextrin as a cheap filler', () => {
    const r = analyzeFillers({}, flat('maltodextrin, whey protein'));
    expect(r.findings[0]).toMatchObject({ code: 'filler.early', severity: 'bad' });
  });

  it('spots the isolated-fibre "net carbs" trick', () => {
    const r = analyzeFillers({ fiber100g: 18 }, flat('whey, soluble corn fiber, polydextrose'));
    expect(r.isolatedFibers.map((f) => f.term.id)).toEqual(['solubleCornFiber', 'polydextrose']);
    expect(r.findings.map((f) => f.code)).toContain('fiber.netCarbTrick');
  });

  it('praises naturally high fibre', () => {
    expect(analyzeFillers({ fiber100g: 8 }, flat('oats, peanuts')).findings[0]?.code).toBe('fiber.high');
  });
});

describe('salt', () => {
  it('derives salt from sodium and gives per-serving share of the 6 g RI', () => {
    const r = analyzeSalt(makeProduct({ nutriments: { sodium100g: 0.8 }, servingSizeG: 50 }));
    expect(r.salt100g).toBe(2);
    expect(r.saltPerServing).toBe(1);
    expect(r.servingPctOfRI).toBe(17);
    expect(r.findings[0]?.code).toBe('salt.high');
  });
});

describe('value', () => {
  it('computes cost per 30 g of protein', () => {
    // 1000 g tub at 78% protein = 780 g protein; €30 → €1.15 per 30 g
    expect(costPer30gProtein(30, 1000, 78)).toBe(1.15);
  });
  it('rejects invalid inputs', () => {
    expect(costPer30gProtein(0, 1000, 78)).toBeUndefined();
    expect(costPer30gProtein(10, 0, 78)).toBeUndefined();
    expect(costPer30gProtein(10, 1000, 0)).toBeUndefined();
  });
  it('builds a full value summary', () => {
    expect(analyzeValue(2.5, 60, 33)).toEqual({ price: 2.5, packageSizeG: 60, proteinPerPackG: 19.8, costPer100g: 4.17, costPer30gProtein: 3.79 });
  });
});
