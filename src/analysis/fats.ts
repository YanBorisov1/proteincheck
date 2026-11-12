import { TRAFFIC_LIGHTS } from './config';
import { HYDROGENATED_PATTERN, PALM_PATTERN, PARTIALLY_HYDROGENATED_PATTERN, UNSPECIFIED_VEG_FAT_PATTERN, matchesTerm } from './lexicon';
import type { Ingredient } from './text';
import type { Finding, Nutriments } from './types';

export interface FatAnalysis {
  fat100g?: number;
  saturatedFat100g?: number;
  transFat100g?: number;
  palm: boolean;
  hydrogenated: boolean;
  partiallyHydrogenated: boolean;
  unspecifiedVegetableFat: boolean;
  findings: Finding[];
}

export function analyzeFats(n: Nutriments, flat: Ingredient[], rawIngredients: string): FatAnalysis {
  const has = (p: string) => flat.some((i) => matchesTerm(i.norm, p)) || matchesTerm(rawIngredients.toLowerCase(), p);
  const palm = has(PALM_PATTERN) && !/palm(?:[- ]oil)?[- ]free/.test(rawIngredients.toLowerCase());
  const hydrogenated = has(HYDROGENATED_PATTERN);
  const partiallyHydrogenated = has(PARTIALLY_HYDROGENATED_PATTERN);
  const unspecifiedVegetableFat = flat.some((i) => i.children.length === 0 && matchesTerm(i.norm, UNSPECIFIED_VEG_FAT_PATTERN));
  const findings: Finding[] = [];
  const result: FatAnalysis = { palm, hydrogenated, partiallyHydrogenated, unspecifiedVegetableFat, findings };
  if (n.fat100g !== undefined) result.fat100g = n.fat100g;
  if (n.saturatedFat100g !== undefined) result.saturatedFat100g = n.saturatedFat100g;
  if (n.transFat100g !== undefined) result.transFat100g = n.transFat100g;

  const sat = n.saturatedFat100g;
  if (sat !== undefined) {
    if (sat > TRAFFIC_LIGHTS.saturatedFat.high) findings.push({ code: 'fat.satHigh', severity: 'warn', weight: 6, params: { sat } });
    else if (sat <= TRAFFIC_LIGHTS.saturatedFat.low) findings.push({ code: 'fat.satLow', severity: 'good', weight: 2, params: { sat } });
  }
  if (partiallyHydrogenated) findings.push({ code: 'fat.partiallyHydrogenated', severity: 'bad', weight: 10 });
  else if (hydrogenated) findings.push({ code: 'fat.hydrogenated', severity: 'bad', weight: 7 });
  if (n.transFat100g !== undefined && n.transFat100g >= 0.5) {
    findings.push({ code: 'fat.trans', severity: 'bad', weight: 9, params: { trans: n.transFat100g } });
  }
  if (palm) findings.push({ code: 'fat.palm', severity: 'warn', weight: 4 });
  if (unspecifiedVegetableFat) findings.push({ code: 'fat.unspecified', severity: 'info', weight: 2 });
  return result;
}
