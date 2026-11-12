import { ENERGY_FACTORS } from './config';
import type { Nutriments } from './types';
import { round } from './text';

export interface EnergyInfo {
  kcal100g?: number;
  estimated: boolean;
}

/** Energy per 100 g: label value when present, otherwise estimated from macros. */
export function energyKcal(n: Nutriments): EnergyInfo {
  if (n.energyKcal100g !== undefined && n.energyKcal100g > 0) {
    return { kcal100g: n.energyKcal100g, estimated: false };
  }
  if (n.proteins100g === undefined || n.carbohydrates100g === undefined || n.fat100g === undefined) {
    return { estimated: true };
  }
  const polyols = n.polyols100g ?? 0;
  const kcal =
    n.proteins100g * ENERGY_FACTORS.protein +
    Math.max(0, n.carbohydrates100g - polyols) * ENERGY_FACTORS.carbohydrate +
    polyols * ENERGY_FACTORS.polyol +
    n.fat100g * ENERGY_FACTORS.fat +
    (n.fiber100g ?? 0) * ENERGY_FACTORS.fiber;
  return kcal > 0 ? { kcal100g: round(kcal, 0), estimated: true } : { estimated: true };
}

/** Salt in g/100 g, derived from sodium when needed (salt = sodium × 2.5). */
export function saltPer100g(n: Nutriments): number | undefined {
  if (n.salt100g !== undefined) return n.salt100g;
  if (n.sodium100g !== undefined) return round(n.sodium100g * 2.5, 2);
  return undefined;
}

export function perServing(per100g: number | undefined, servingG: number | undefined): number | undefined {
  if (per100g === undefined || servingG === undefined || servingG <= 0) return undefined;
  return round((per100g * servingG) / 100, 1);
}
