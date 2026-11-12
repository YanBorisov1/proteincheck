import { EU_CLAIMS } from './config';
import { normalize } from './text';
import type { Finding, Product } from './types';

/**
 * high     — explicit "high protein" / "rich in protein" claim
 * source   — explicit "source of protein" claim
 * implied  — protein is the marketing hook (e.g. "Protein Bar", category protein powder)
 * none     — no protein marketing found
 */
export type ProteinClaim = 'high' | 'source' | 'implied' | 'none';
export type ClaimStatus = 'meets' | 'partial' | 'fails' | 'noClaim' | 'unknown';

export interface ClaimCheck {
  claim: ProteinClaim;
  energyPct?: number;
  meetsSource?: boolean;
  meetsHigh?: boolean;
  status: ClaimStatus;
  findings: Finding[];
}

const HIGH_RE = /high[- ]?protein|rich in protein|protein[- ]rich|high[- ]proteins|proteinreich|riche en proteines|alto en proteinas|ricco di proteine|\d+\s?g (?:of )?protein/;
const SOURCE_RE = /source[- ]of[- ]protein|sources?[- ]of[- ]proteins|proteinquelle|source de proteines|fuente de proteinas/;
const IMPLIED_RE = /protein|proteine|proteina|eiweiss|whey|\bpro\b/;

export function detectProteinClaim(product: Product): ProteinClaim {
  const marketing = normalize([product.name, ...product.labels].join(' | '));
  if (HIGH_RE.test(marketing)) return 'high';
  if (SOURCE_RE.test(marketing)) return 'source';
  const categories = normalize(product.categories.join(' | '));
  if (IMPLIED_RE.test(normalize(product.name)) || /protein-(?:bars|powders|shakes|supplements)|high-protein/.test(categories)) {
    return 'implied';
  }
  return 'none';
}

export function checkProteinClaim(product: Product, energyPct: number | undefined): ClaimCheck {
  const claim = detectProteinClaim(product);
  const findings: Finding[] = [];
  if (energyPct === undefined) {
    return { claim, status: claim === 'none' ? 'noClaim' : 'unknown', findings };
  }
  const meetsSource = energyPct >= EU_CLAIMS.sourceOfProteinPct;
  const meetsHigh = energyPct >= EU_CLAIMS.highProteinPct;
  const base = { claim, energyPct, meetsSource, meetsHigh };
  const params = { pct: energyPct, source: EU_CLAIMS.sourceOfProteinPct, high: EU_CLAIMS.highProteinPct };

  if (claim === 'none') {
    if (meetsHigh) findings.push({ code: 'claim.qualifiesHigh', severity: 'good', weight: 2, params });
    return { ...base, status: 'noClaim', findings };
  }
  if (claim === 'high') {
    if (meetsHigh) {
      findings.push({ code: 'claim.highMet', severity: 'good', weight: 5, params });
      return { ...base, status: 'meets', findings };
    }
    findings.push({
      code: meetsSource ? 'claim.highOnlySource' : 'claim.highFails',
      severity: 'bad',
      weight: meetsSource ? 8 : 10,
      params,
    });
    return { ...base, status: meetsSource ? 'partial' : 'fails', findings };
  }
  if (claim === 'source') {
    if (meetsSource) {
      findings.push({ code: 'claim.sourceMet', severity: 'good', weight: 3, params });
      return { ...base, status: 'meets', findings };
    }
    findings.push({ code: 'claim.sourceFails', severity: 'bad', weight: 10, params });
    return { ...base, status: 'fails', findings };
  }
  // implied
  if (meetsHigh) {
    findings.push({ code: 'claim.impliedMetHigh', severity: 'good', weight: 4, params });
    return { ...base, status: 'meets', findings };
  }
  if (meetsSource) {
    findings.push({ code: 'claim.impliedOnlySource', severity: 'warn', weight: 7, params });
    return { ...base, status: 'partial', findings };
  }
  findings.push({ code: 'claim.impliedFails', severity: 'bad', weight: 10, params });
  return { ...base, status: 'fails', findings };
}
