import { FIBER } from './config';
import { FILLERS, matchesTerm, type Term } from './lexicon';
import type { Ingredient } from './text';
import type { Finding, Nutriments } from './types';

export interface DetectedFiller {
  term: Term;
  position: number;
  matchedText: string;
}

export interface FillerAnalysis {
  fiber100g?: number;
  fillers: DetectedFiller[];
  isolatedFibers: DetectedFiller[];
  findings: Finding[];
}

export function analyzeFillers(n: Nutriments, flat: Ingredient[]): FillerAnalysis {
  const fillers: DetectedFiller[] = [];
  const isolatedFibers: DetectedFiller[] = [];
  const seen = new Set<string>();
  for (const ing of flat) {
    for (const term of FILLERS) {
      if (seen.has(term.id)) continue;
      if (matchesTerm(ing.norm, term.pattern)) {
        seen.add(term.id);
        const d = { term, position: ing.position, matchedText: ing.text };
        (term.category === 'isolatedFiber' ? isolatedFibers : fillers).push(d);
      }
    }
  }
  const findings: Finding[] = [];
  const result: FillerAnalysis = { fillers, isolatedFibers, findings };
  if (n.fiber100g !== undefined) result.fiber100g = n.fiber100g;

  const cheap = fillers.filter((f) => ['maltodextrin', 'glucoseSyrup', 'dextrin', 'imo'].includes(f.term.id));
  if (cheap.length > 0) {
    const early = cheap.some((f) => f.position <= 2);
    findings.push({
      code: early ? 'filler.early' : 'filler.present',
      severity: early ? 'bad' : 'warn',
      weight: early ? 8 : 5,
      params: { names: cheap.map((f) => f.matchedText).join(', ') },
    });
  }
  if (fillers.some((f) => f.term.id === 'imo')) {
    findings.push({ code: 'filler.imo', severity: 'warn', weight: 6 });
  }
  const fiber = n.fiber100g;
  if (isolatedFibers.length > 0 && fiber !== undefined && fiber >= FIBER.high) {
    findings.push({
      code: 'fiber.netCarbTrick',
      severity: 'warn',
      weight: 5,
      params: { fiber, names: isolatedFibers.map((f) => f.matchedText).join(', ') },
    });
  } else if (fiber !== undefined && fiber >= FIBER.high) {
    findings.push({ code: 'fiber.high', severity: 'good', weight: 4, params: { fiber } });
  } else if (fiber !== undefined && fiber >= FIBER.source) {
    findings.push({ code: 'fiber.source', severity: 'good', weight: 2, params: { fiber } });
  }
  return result;
}
