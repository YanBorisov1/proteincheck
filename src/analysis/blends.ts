import { BLEND_PATTERN, matchesTerm } from './lexicon';
import type { Ingredient } from './text';
import type { Finding } from './types';

export interface BlendInfo {
  text: string;
  proprietary: boolean;
  disclosed: boolean;
}

export interface BlendAnalysis {
  blends: BlendInfo[];
  findings: Finding[];
}

const AMOUNT_RE = /\d+(?:[.,]\d+)?\s?(?:%|(?:mg|g)\b)/;

export function analyzeBlends(flat: Ingredient[]): BlendAnalysis {
  const blends: BlendInfo[] = [];
  for (const ing of flat) {
    if (!matchesTerm(ing.norm, BLEND_PATTERN)) continue;
    // "vitamin & mineral complex" or "B-vitamin complex" are not hiding protein amounts.
    if (/vitamin|mineral/.test(ing.norm)) continue;
    const childAmounts = ing.children.length > 0 && ing.children.every((c) => AMOUNT_RE.test(c.text));
    const disclosed = childAmounts || (ing.children.length === 0 && AMOUNT_RE.test(ing.text) && /proprietary/.test(ing.norm) === false);
    blends.push({ text: ing.text, proprietary: /proprietary|matrix/.test(ing.norm), disclosed });
  }
  const findings: Finding[] = [];
  const hidden = blends.filter((b) => !b.disclosed);
  if (hidden.some((b) => b.proprietary)) {
    findings.push({ code: 'blend.proprietary', severity: 'bad', weight: 7, params: { count: hidden.length } });
  } else if (hidden.length > 0) {
    findings.push({ code: 'blend.undisclosed', severity: 'info', weight: 3, params: { count: hidden.length } });
  } else if (blends.length > 0) {
    findings.push({ code: 'blend.disclosed', severity: 'good', weight: 3 });
  }
  return { blends, findings };
}
