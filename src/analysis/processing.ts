import { CULINARY_ONLY, UPF_MARKERS, matchesTerm } from './lexicon';
import type { Ingredient } from './text';
import type { Finding, NovaGroup, Product } from './types';

export interface ProcessingAnalysis {
  nova?: NovaGroup;
  novaEstimated: boolean;
  ingredientCount: number;
  /** Ingredients that pushed the estimate to NOVA 4. */
  markers: string[];
  findings: Finding[];
}

/**
 * Rough NOVA estimate from the ingredient list:
 *  4 — any ultra-processing marker (isolates, syrups, sweeteners, emulsifiers, flavourings…)
 *  3 — several ingredients including culinary ones (sugar, salt, oil)
 *  2 — only culinary ingredients
 *  1 — a single whole food (optionally with cultures / vitamins)
 */
export function estimateNova(top: Ingredient[], flat: Ingredient[]): { nova?: NovaGroup; markers: string[] } {
  if (top.length === 0) return { markers: [] };
  const markers: string[] = [];
  for (const ing of flat) {
    if (UPF_MARKERS.some((p) => matchesTerm(ing.norm, p))) markers.push(ing.text);
  }
  if (markers.length > 0) return { nova: 4, markers };
  const culinary = top.filter((i) => CULINARY_ONLY.some((c) => matchesTerm(i.norm, c)));
  if (culinary.length === top.length) return { nova: 2, markers };
  const minor = top.filter((i) => /culture|ferment|vitamin|enzyme|rennet|water/.test(i.norm));
  if (top.length - minor.length <= 1) return { nova: 1, markers };
  return { nova: 3, markers };
}

export function analyzeProcessing(product: Product, top: Ingredient[], flat: Ingredient[]): ProcessingAnalysis {
  const estimate = estimateNova(top, flat);
  const nova = product.novaGroup ?? estimate.nova;
  const findings: Finding[] = [];
  const result: ProcessingAnalysis = {
    novaEstimated: product.novaGroup === undefined,
    ingredientCount: top.length,
    markers: estimate.markers,
    findings,
  };
  if (nova !== undefined) result.nova = nova;
  if (nova === 4) findings.push({ code: 'processing.ultra', severity: 'warn', weight: 5, params: { count: top.length } });
  else if (nova === 1) findings.push({ code: 'processing.minimal', severity: 'good', weight: 7 });
  else if (nova === 2 || nova === 3) findings.push({ code: 'processing.processed', severity: 'info', weight: 2 });
  if (top.length >= 20) findings.push({ code: 'processing.longList', severity: 'warn', weight: 4, params: { count: top.length } });
  else if (top.length > 0 && top.length <= 5) findings.push({ code: 'processing.shortList', severity: 'good', weight: 4, params: { count: top.length } });
  if (top.length === 0) findings.push({ code: 'processing.noIngredients', severity: 'info', weight: 4 });
  return result;
}
