import { SUGAR_PROTEIN_RATIO, TRAFFIC_LIGHTS } from './config';
import { ADDED_SUGARS, INTENSE_SWEETENERS, SUGAR_ALCOHOLS, matchesTerm, type IntenseSweetener, type SugarAlcohol } from './lexicon';
import { round, type Ingredient } from './text';
import type { Finding, Nutriments } from './types';

export interface SugarAnalysis {
  sugars100g?: number;
  addedSugars100g?: number;
  polyols100g?: number;
  /** Ingredient texts recognised as added sugars, in list order. */
  addedSugarIngredients: string[];
  sugarAlcohols: SugarAlcohol[];
  sweeteners: IntenseSweetener[];
  /** Grams of sugar per gram of protein. */
  sugarToProtein?: number;
  findings: Finding[];
}

function detect<T extends { id: string; pattern: string }>(flat: Ingredient[], list: readonly T[]): T[] {
  const out: T[] = [];
  for (const item of list) {
    if (flat.some((ing) => matchesTerm(ing.norm, item.pattern))) out.push(item);
  }
  return out;
}

export function analyzeSugars(n: Nutriments, flat: Ingredient[]): SugarAnalysis {
  const addedSugarIngredients: string[] = [];
  for (const ing of flat) {
    if (ing.children.length > 0) continue;
    if (/sugar alcohol|sugar[- ]free|no added sugar/.test(ing.norm)) continue;
    if (ADDED_SUGARS.some((t) => matchesTerm(ing.norm, t.pattern))) addedSugarIngredients.push(ing.text);
  }
  const sugarAlcohols = detect(flat, SUGAR_ALCOHOLS);
  const sweeteners = detect(flat, INTENSE_SWEETENERS);
  const findings: Finding[] = [];
  const result: SugarAnalysis = { addedSugarIngredients, sugarAlcohols, sweeteners, findings };
  if (n.sugars100g !== undefined) result.sugars100g = n.sugars100g;
  if (n.addedSugars100g !== undefined) result.addedSugars100g = n.addedSugars100g;
  if (n.polyols100g !== undefined) result.polyols100g = n.polyols100g;

  const sugars = n.sugars100g;
  if (sugars !== undefined) {
    if (sugars > TRAFFIC_LIGHTS.sugars.high) {
      findings.push({ code: 'sugar.high', severity: 'bad', weight: 9, params: { sugar: sugars } });
    } else if (sugars <= TRAFFIC_LIGHTS.sugars.low) {
      findings.push({ code: 'sugar.low', severity: 'good', weight: 5, params: { sugar: sugars } });
    } else if (sugars > 10) {
      findings.push({ code: 'sugar.medium', severity: 'warn', weight: 4, params: { sugar: sugars } });
    }
    if (n.proteins100g !== undefined && n.proteins100g > 0) {
      const ratio = round(sugars / n.proteins100g, 2);
      result.sugarToProtein = ratio;
      if (ratio >= SUGAR_PROTEIN_RATIO.bad) {
        findings.push({ code: 'sugar.moreSugarThanProtein', severity: 'bad', weight: 10, params: { ratio } });
      } else if (ratio >= SUGAR_PROTEIN_RATIO.poor) {
        findings.push({ code: 'sugar.ratioPoor', severity: 'warn', weight: 6, params: { ratio } });
      }
    }
  }
  if (addedSugarIngredients.length >= 3) {
    findings.push({ code: 'sugar.manyTypes', severity: 'warn', weight: 6, params: { count: addedSugarIngredients.length, list: addedSugarIngredients.slice(0, 5).join(', ') } });
  }
  const firstSugarPos = flat.find((ing) => ing.depth === 0 && ing.children.length === 0 && addedSugarIngredients.includes(ing.text))?.position;
  if (firstSugarPos !== undefined && firstSugarPos <= 1) {
    findings.push({ code: 'sugar.topIngredient', severity: 'bad', weight: 8, params: { position: firstSugarPos + 1 } });
  }
  if (sugarAlcohols.length > 0) {
    const maltitol = sugarAlcohols.some((s) => s.id === 'maltitol');
    const polyols = n.polyols100g;
    findings.push({
      code: maltitol ? 'sugar.maltitol' : 'sugar.polyols',
      severity: maltitol || (polyols !== undefined && polyols >= 10) ? 'warn' : 'info',
      weight: maltitol ? 6 : 4,
      params: { names: sugarAlcohols.map((s) => s.name).join(', '), polyols: polyols ?? '?' },
    });
  }
  if (sweeteners.length > 0) {
    findings.push({ code: 'sugar.sweeteners', severity: 'info', weight: 2, params: { names: sweeteners.map((s) => s.name).join(', ') } });
  }
  return result;
}
