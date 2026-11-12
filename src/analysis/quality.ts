import { QUALITY } from './config';
import { PROTEIN_SOURCES, SPIKING_AGENTS, matchesTerm, type ProteinSource, type SpikingAgent } from './lexicon';
import { round, type Ingredient } from './text';
import type { Finding } from './types';

export interface DetectedSource {
  source: ProteinSource;
  /** Top-level ingredient position (0 = largest by weight). */
  position: number;
  matchedText: string;
  percent?: number;
}

export interface ProteinQuality {
  sources: DetectedSource[];
  main?: DetectedSource;
  /** Weighted PDCAAS estimate 0–1, or undefined when no source was found. */
  estimatedPdcaas?: number;
  complementary: boolean;
  findings: Finding[];
}

/** Finds protein sources in ingredient order, one entry per source type. */
export function detectProteinSources(flat: Ingredient[]): DetectedSource[] {
  const found = new Map<string, DetectedSource>();
  for (const ing of flat) {
    for (const source of PROTEIN_SOURCES) {
      if (found.has(source.id)) continue;
      if (matchesTerm(ing.norm, source.pattern)) {
        const entry: DetectedSource = { source, position: ing.position, matchedText: ing.text };
        if (ing.percent !== undefined) entry.percent = ing.percent;
        found.set(source.id, entry);
        break;
      }
    }
  }
  // Explicit protein ingredients ("soy protein isolate", "whey", "collagen hydrolysate") rank
  // before incidental ones (e.g. milk powder inside a chocolate coating), then by position.
  return [...found.values()].sort((a, b) => Number(isExplicit(b)) - Number(isExplicit(a)) || a.position - b.position);
}

const EXPLICIT_RE = /protein|isolate|concentrate|hydroly|whey|casein|collagen|gelatin|albumen|egg white|skyr|quark/i;

/** True when the matched ingredient is itself a protein ingredient rather than a food containing some. */
export function isExplicit(s: DetectedSource): boolean {
  return EXPLICIT_RE.test(s.matchedText);
}

const midpoint = (r: readonly [number, number]) => (r[0] + r[1]) / 2;

/**
 * Weighted PDCAAS: declared percentages are used when every source has one;
 * otherwise weights decay with list position (ingredients are listed by weight).
 */
export function estimatePdcaas(sources: DetectedSource[]): number | undefined {
  if (sources.length === 0) return undefined;
  const allPct = sources.every((s) => s.percent !== undefined && s.percent > 0);
  let total = 0;
  let weightSum = 0;
  sources.forEach((s, i) => {
    const w = allPct ? (s.percent ?? 0) : 1 / (i + 1) ** 1.5;
    total += midpoint(s.source.pdcaas) * w;
    weightSum += w;
  });
  return weightSum > 0 ? round(total / weightSum, 2) : undefined;
}

const COMPLEMENT_A = new Set(['pea', 'fava', 'soy']);
const COMPLEMENT_B = new Set(['rice', 'oat', 'wheat', 'hemp']);

export function isComplementary(sources: DetectedSource[]): boolean {
  const ids = new Set(sources.map((s) => s.source.id));
  return [...ids].some((id) => COMPLEMENT_A.has(id)) && [...ids].some((id) => COMPLEMENT_B.has(id));
}

export function analyzeProteinQuality(flat: Ingredient[]): ProteinQuality {
  const sources = detectProteinSources(flat);
  const findings: Finding[] = [];
  const main = sources[0];
  let estimatedPdcaas = estimatePdcaas(sources);
  const complementary = isComplementary(sources);
  if (complementary && estimatedPdcaas !== undefined && estimatedPdcaas < QUALITY.complementaryPdcaas) {
    estimatedPdcaas = QUALITY.complementaryPdcaas;
    findings.push({ code: 'quality.complementary', severity: 'good', weight: 3 });
  }
  const result: ProteinQuality = { sources, complementary, findings };
  if (main) result.main = main;
  if (estimatedPdcaas !== undefined) result.estimatedPdcaas = estimatedPdcaas;

  if (!main) {
    findings.push({ code: 'quality.noSource', severity: 'info', weight: 3 });
    return result;
  }
  const name = main.source.id;
  if (main.source.id === 'collagen' || main.source.id === 'beef') {
    findings.push({ code: 'quality.mainIncompleteCollagen', severity: 'bad', weight: 9, params: { source: name } });
  } else if (!main.source.complete && !complementary) {
    findings.push({
      code: 'quality.mainIncomplete',
      severity: 'warn',
      weight: 6,
      params: { source: name, limiting: main.source.limiting ?? '' },
    });
  } else if (main.source.pdcaas[0] >= 0.9) {
    findings.push({ code: 'quality.mainComplete', severity: 'good', weight: 6, params: { source: name } });
  }
  const collagenLater = sources.find((s, i) => i > 0 && s.source.id === 'collagen');
  if (collagenLater) {
    findings.push({ code: 'quality.containsCollagen', severity: 'warn', weight: 5 });
  }
  return result;
}

// ------------------------------------------------------------------ amino spiking

export interface DetectedSpiking {
  agent: SpikingAgent;
  position: number;
  matchedText: string;
}

export interface SpikingResult {
  agents: DetectedSpiking[];
  findings: Finding[];
}

/** Ingredients like "vitamin" premixes or salts that merely contain these words are ignored. */
const SPIKING_EXCLUDE = /glycinate|bisglycinate|arginate|vitamin|electrolyte/;

export function detectAminoSpiking(flat: Ingredient[], hasProteinSource: boolean): SpikingResult {
  const agents: DetectedSpiking[] = [];
  const seen = new Set<string>();
  for (const ing of flat) {
    if (SPIKING_EXCLUDE.test(ing.norm)) continue;
    for (const agent of SPIKING_AGENTS) {
      if (seen.has(agent.id)) continue;
      if (matchesTerm(ing.norm, agent.pattern)) {
        seen.add(agent.id);
        agents.push({ agent, position: ing.position, matchedText: ing.text });
      }
    }
  }
  const findings: Finding[] = [];
  if (agents.length > 0) {
    const names = agents.map((a) => a.agent.name).join(', ');
    const nonProtein = agents.some((a) => a.agent.nonProtein);
    findings.push({
      code: hasProteinSource ? 'spiking.detected' : 'spiking.detectedNoSource',
      severity: agents.length >= 2 || nonProtein ? 'bad' : 'warn',
      weight: agents.length >= 2 || nonProtein ? 9 : 6,
      params: { names, count: agents.length },
    });
  } else if (hasProteinSource) {
    findings.push({ code: 'spiking.none', severity: 'good', weight: 2 });
  }
  return { agents, findings };
}
