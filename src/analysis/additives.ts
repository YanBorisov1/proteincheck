import additivesData from '../data/additives.json';
import { termRegex } from './lexicon';
import type { Ingredient } from './text';
import type { AdditiveEntry, Concern, Finding } from './types';

export const ADDITIVES: readonly AdditiveEntry[] = additivesData as AdditiveEntry[];

const BY_ID = new Map(ADDITIVES.map((a) => [a.id.toLowerCase(), a]));

export function getAdditive(id: string): AdditiveEntry | undefined {
  return BY_ID.get(id.toLowerCase());
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** All name/synonym strings, longest first, so "natural flavouring" wins over "flavouring". */
const NAME_INDEX: ReadonlyArray<{ text: string; entry: AdditiveEntry; re: RegExp }> = ADDITIVES.flatMap((entry) =>
  [entry.name, ...entry.synonyms].map((text) => ({ text: text.toLowerCase(), entry })),
)
  .sort((a, b) => b.text.length - a.text.length)
  .map((x) => ({ ...x, re: termRegex(escapeRe(x.text), 'gi') }));

export const E_NUMBER_RE = /(?<![a-z0-9])e[ -]?(\d{3,4})\s?([a-z])?(?:\s?\(?(?:i{1,3}|iv|vi{0,3})\)?)?(?![0-9])/gi;

/** Resolves "E160", "E 160a", "e-471" to a database entry, falling back to the base number. */
export function lookupENumber(num: string, letter?: string): AdditiveEntry | undefined {
  const exact = letter ? BY_ID.get(`e${num}${letter.toLowerCase()}`) : undefined;
  if (exact) return exact;
  const base = BY_ID.get(`e${num}`);
  if (base) return base;
  return ADDITIVES.find((a) => a.eNumber?.toLowerCase().startsWith(`e${num}`));
}

export interface DetectedAdditive {
  /** Entry from the bundled database, or undefined for unknown E-numbers. */
  entry?: AdditiveEntry;
  code: string;
  matchedText: string;
}

export interface AdditiveAnalysis {
  additives: DetectedAdditive[];
  unknownCount: number;
  countsByConcern: Record<Concern, number>;
  findings: Finding[];
}

export function detectAdditives(flat: Ingredient[]): DetectedAdditive[] {
  const found = new Map<string, DetectedAdditive>();
  for (const ing of flat) {
    let text = ing.norm;
    for (const m of text.matchAll(E_NUMBER_RE)) {
      const num = m[1] ?? '';
      const entry = lookupENumber(num, m[2]);
      const code = entry?.id ?? `E${num}${m[2] ?? ''}`.toUpperCase();
      if (!found.has(code)) {
        const d: DetectedAdditive = { code, matchedText: m[0].trim() };
        if (entry) d.entry = entry;
        found.set(code, d);
      }
    }
    text = text.replace(E_NUMBER_RE, ' ');
    for (const { entry, re } of NAME_INDEX) {
      re.lastIndex = 0;
      const m = re.exec(text);
      if (!m) continue;
      if (!found.has(entry.id)) found.set(entry.id, { entry, code: entry.id, matchedText: m[0] });
      text = text.replace(re, (s) => ' '.repeat(s.length));
    }
  }
  return [...found.values()];
}

export function analyzeAdditives(flat: Ingredient[]): AdditiveAnalysis {
  const additives = detectAdditives(flat);
  const countsByConcern: Record<Concern, number> = { none: 0, limited: 0, moderate: 0, high: 0 };
  let unknownCount = 0;
  for (const a of additives) {
    if (a.entry) countsByConcern[a.entry.concern]++;
    else unknownCount++;
  }
  const findings: Finding[] = [];
  const names = (c: Concern) =>
    additives
      .filter((a) => a.entry?.concern === c)
      .map((a) => a.entry?.name ?? a.code)
      .join(', ');
  if (countsByConcern.high > 0) {
    findings.push({ code: 'additives.high', severity: 'bad', weight: 9, params: { names: names('high') } });
  }
  if (countsByConcern.moderate > 0) {
    findings.push({ code: 'additives.moderate', severity: 'warn', weight: 6, params: { names: names('moderate'), count: countsByConcern.moderate } });
  }
  if (additives.length >= 8) {
    findings.push({ code: 'additives.many', severity: 'warn', weight: 4, params: { count: additives.length } });
  } else if (additives.length === 0 && flat.length > 0) {
    findings.push({ code: 'additives.none', severity: 'good', weight: 4 });
  } else if (countsByConcern.high === 0 && countsByConcern.moderate === 0 && additives.length > 0) {
    findings.push({ code: 'additives.lowConcern', severity: 'good', weight: 2, params: { count: additives.length } });
  }
  return { additives, unknownCount, countsByConcern, findings };
}
