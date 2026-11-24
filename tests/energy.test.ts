import { describe, expect, it } from 'vitest';
import { analyzeProduct } from '../src/analysis';
import { analyzeEnergy } from '../src/analysis/energy';
import { makeProduct, wheyPowder } from './fixtures';

describe('calories', () => {
  it('gives calories per 100 g, per serving, per package and share of 2000 kcal', () => {
    // 380 kcal/100 g, 30 g serving, 1000 g tub
    expect(analyzeEnergy(wheyPowder)).toEqual({ kcal100g: 380, kcalPerServing: 114, kcalPerPackage: 3800, servingPctOfRI: 6, estimated: false });
  });

  it('marks calories estimated from macros', () => {
    const e = analyzeEnergy(makeProduct({ nutriments: { proteins100g: 20, carbohydrates100g: 50, fat100g: 10 }, servingSizeG: 50 }));
    expect(e).toMatchObject({ kcal100g: 370, kcalPerServing: 185, estimated: true });
  });

  it('handles missing data without inventing numbers', () => {
    expect(analyzeEnergy(makeProduct())).toEqual({ estimated: false });
    expect(analyzeEnergy(makeProduct({ nutriments: { energyKcal100g: 200 } }))).toEqual({ kcal100g: 200, estimated: false });
  });

  it('is part of the full analysis', () => {
    expect(analyzeProduct(wheyPowder).energy.kcalPerServing).toBe(114);
  });
});
