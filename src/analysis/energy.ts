import { REFERENCE_INTAKES } from './config';
import { energyKcal } from './nutrition';
import { round } from './text';
import type { Product } from './types';

export interface EnergyAnalysis {
  kcal100g?: number;
  kcalPerServing?: number;
  kcalPerPackage?: number;
  /** Share of the 2000 kcal adult reference intake per serving, 0–100+. */
  servingPctOfRI?: number;
  /** True when calories were not on the label and were estimated from macros. */
  estimated: boolean;
}

export function analyzeEnergy(product: Product): EnergyAnalysis {
  const e = energyKcal(product.nutriments);
  const result: EnergyAnalysis = { estimated: e.estimated && e.kcal100g !== undefined };
  if (e.kcal100g === undefined) return result;
  result.kcal100g = e.kcal100g;
  const serving = product.servingSizeG;
  if (serving !== undefined && serving > 0) {
    result.kcalPerServing = round((e.kcal100g * serving) / 100, 0);
    result.servingPctOfRI = round((result.kcalPerServing / REFERENCE_INTAKES.energyKcal) * 100, 0);
  }
  const pkg = product.packageSizeG;
  if (pkg !== undefined && pkg > 0) result.kcalPerPackage = round((e.kcal100g * pkg) / 100, 0);
  return result;
}
