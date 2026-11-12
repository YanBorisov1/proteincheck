import { REFERENCE_INTAKES, TRAFFIC_LIGHTS } from './config';
import { perServing, saltPer100g } from './nutrition';
import { round } from './text';
import type { Finding, Product } from './types';

export interface SaltAnalysis {
  salt100g?: number;
  sodium100g?: number;
  saltPerServing?: number;
  /** Share of the 6 g adult reference intake per serving, 0–100+. */
  servingPctOfRI?: number;
  findings: Finding[];
}

export function analyzeSalt(product: Product): SaltAnalysis {
  const salt = saltPer100g(product.nutriments);
  const findings: Finding[] = [];
  const result: SaltAnalysis = { findings };
  if (salt === undefined) return result;
  result.salt100g = salt;
  result.sodium100g = round(salt / 2.5, 3);
  const serving = perServing(salt, product.servingSizeG);
  if (serving !== undefined) {
    result.saltPerServing = serving;
    result.servingPctOfRI = round((serving / REFERENCE_INTAKES.salt) * 100, 0);
  }
  if (salt > TRAFFIC_LIGHTS.salt.high) findings.push({ code: 'salt.high', severity: 'warn', weight: 6, params: { salt } });
  else if (salt <= TRAFFIC_LIGHTS.salt.low) findings.push({ code: 'salt.low', severity: 'good', weight: 1, params: { salt } });
  return result;
}
