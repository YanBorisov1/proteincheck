import { ENERGY_FACTORS } from './config';
import { energyKcal, perServing } from './nutrition';
import { round } from './text';
import type { Finding, Product } from './types';

export interface ProteinDensity {
  per100g?: number;
  perServing?: number;
  per100kcal?: number;
  /** Share of energy coming from protein, 0–100. */
  energyPct?: number;
  kcal100g?: number;
  kcalEstimated: boolean;
  findings: Finding[];
}

export function analyzeProteinDensity(product: Product): ProteinDensity {
  const protein = product.nutriments.proteins100g;
  const energy = energyKcal(product.nutriments);
  const result: ProteinDensity = { kcalEstimated: energy.estimated, findings: [] };
  if (energy.kcal100g !== undefined) result.kcal100g = energy.kcal100g;
  if (protein === undefined) {
    result.findings.push({ code: 'protein.missing', severity: 'info', weight: 3 });
    return result;
  }
  result.per100g = protein;
  const serving = perServing(protein, product.servingSizeG);
  if (serving !== undefined) result.perServing = serving;
  if (energy.kcal100g !== undefined && energy.kcal100g > 0) {
    result.per100kcal = round((protein / energy.kcal100g) * 100, 1);
    result.energyPct = round(Math.min(100, ((protein * ENERGY_FACTORS.protein) / energy.kcal100g) * 100), 0);
  }
  const pct = result.energyPct;
  if (pct !== undefined) {
    if (pct >= 50) result.findings.push({ code: 'protein.veryDense', severity: 'good', weight: 8, params: { pct } });
    else if (pct >= 30) result.findings.push({ code: 'protein.dense', severity: 'good', weight: 6, params: { pct } });
    else if (pct < 12) result.findings.push({ code: 'protein.lowDensity', severity: 'bad', weight: 8, params: { pct } });
    else if (pct < 20) result.findings.push({ code: 'protein.modestDensity', severity: 'warn', weight: 5, params: { pct } });
  }
  if (energy.estimated && energy.kcal100g !== undefined) {
    result.findings.push({ code: 'energy.estimated', severity: 'info', weight: 1 });
  }
  return result;
}
