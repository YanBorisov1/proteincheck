import {
  ADDITIVE_PENALTY,
  CLAIM_SCORE,
  DENSITY_CURVE,
  GRADE_THRESHOLDS,
  NOVA_BASE,
  PROCESSING,
  QUALITY,
  SCORE_WEIGHTS,
  SUB_SCORE_KEYS,
  SUGAR_SCORE,
  type Grade,
  type SubScoreKey,
} from './config';
import type { AdditiveAnalysis } from './additives';
import type { ClaimCheck } from './claims';
import type { FatAnalysis } from './fats';
import type { FillerAnalysis } from './fillers';
import type { ProcessingAnalysis } from './processing';
import type { ProteinDensity } from './protein';
import type { ProteinQuality, SpikingResult } from './quality';
import type { SugarAnalysis } from './sugars';
import { clamp, piecewise, round } from './text';

export interface ScoreReason {
  code: string;
  /** Points added (positive) or removed (negative); undefined for the base line. */
  delta?: number;
  params?: Record<string, string | number>;
}

export interface SubScore {
  key: SubScoreKey;
  weight: number;
  /** 0–100, or null when there isn't enough data. */
  score: number | null;
  reasons: ScoreReason[];
}

export interface ScoreResult {
  /** 0–100, undefined when protein density cannot be computed. */
  total?: number;
  grade?: Grade;
  subScores: SubScore[];
  /** Share of total weight backed by real data (0–1). */
  coverage: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ScoreInputs {
  density: ProteinDensity;
  quality: ProteinQuality;
  spiking: SpikingResult;
  sugars: SugarAnalysis;
  fillers: FillerAnalysis;
  additives: AdditiveAnalysis;
  processing: ProcessingAnalysis;
  fats: FatAnalysis;
  claim: ClaimCheck;
  hasIngredients: boolean;
}

export function gradeFor(score: number): Grade {
  for (const [grade, min] of GRADE_THRESHOLDS) if (score >= min) return grade;
  return 'E';
}

const r0 = (n: number) => round(n, 0);

export function scoreDensity(d: ProteinDensity, q?: ProteinQuality): Omit<SubScore, 'key' | 'weight'> {
  if (d.energyPct === undefined) return { score: null, reasons: [{ code: 'score.noData' }] };
  const reasons: ScoreReason[] = [{ code: 'score.density.base', params: { pct: d.energyPct } }];
  const raw = r0(piecewise(d.energyPct, DENSITY_CURVE));
  const pdcaas = q?.estimatedPdcaas;
  if (pdcaas === undefined || pdcaas >= QUALITY.densityAdjustBelow) return { score: raw, reasons };
  const effectivePct = round(d.energyPct * pdcaas, 0);
  const adjusted = r0(piecewise(effectivePct, DENSITY_CURVE));
  reasons.push({ code: 'score.density.qualityAdjusted', delta: adjusted - raw, params: { pdcaas, effective: effectivePct } });
  return { score: adjusted, reasons };
}

export function scoreQuality(q: ProteinQuality, s: SpikingResult, hasIngredients: boolean): Omit<SubScore, 'key' | 'weight'> {
  if (!hasIngredients) return { score: null, reasons: [{ code: 'score.noIngredients' }] };
  const reasons: ScoreReason[] = [];
  let score: number;
  if (q.estimatedPdcaas !== undefined) {
    score = q.estimatedPdcaas * 100;
    reasons.push({ code: 'score.quality.base', params: { pdcaas: q.estimatedPdcaas } });
    if (q.complementary) reasons.push({ code: 'score.quality.complementary' });
  } else {
    score = QUALITY.unknownSourceScore;
    reasons.push({ code: 'score.quality.unknown', params: { score } });
  }
  if (s.agents.length > 0) {
    const penalty = Math.min(QUALITY.maxSpikingPenalty, s.agents.length * QUALITY.spikingPenalty);
    score -= penalty;
    reasons.push({ code: 'score.quality.spiking', delta: -penalty, params: { count: s.agents.length } });
  }
  return { score: r0(clamp(score)), reasons };
}

export function scoreSugar(su: SugarAnalysis, f: FillerAnalysis): Omit<SubScore, 'key' | 'weight'> {
  if (su.sugars100g === undefined) return { score: null, reasons: [{ code: 'score.noData' }] };
  const reasons: ScoreReason[] = [{ code: 'score.sugar.base' }];
  let score = 100;
  const add = (code: string, delta: number, params?: Record<string, string | number>) => {
    if (delta === 0) return;
    score += delta;
    reasons.push(params ? { code, delta, params } : { code, delta });
  };
  add('score.sugar.amount', -r0(piecewise(su.sugars100g, SUGAR_SCORE.sugarCurve)), { sugar: su.sugars100g });
  if (su.sugarToProtein !== undefined) {
    add('score.sugar.ratio', -r0(piecewise(su.sugarToProtein, SUGAR_SCORE.ratioCurve)), { ratio: su.sugarToProtein });
  }
  if (su.polyols100g !== undefined && su.polyols100g >= SUGAR_SCORE.polyolHighG) {
    add('score.sugar.polyols', -SUGAR_SCORE.polyolPenalty, { polyols: su.polyols100g });
  }
  if (su.sugarAlcohols.some((p) => p.id === 'maltitol')) add('score.sugar.maltitol', -SUGAR_SCORE.maltitolPenalty);
  if (su.sweeteners.length > 0) add('score.sugar.sweeteners', -SUGAR_SCORE.intenseSweetenerPenalty);
  const cheapFillers = f.fillers.filter((x) => ['maltodextrin', 'glucoseSyrup', 'dextrin', 'imo'].includes(x.term.id));
  if (cheapFillers.length > 0) add('score.sugar.fillers', -SUGAR_SCORE.fillerPenalty * cheapFillers.length, { count: cheapFillers.length });
  return { score: r0(clamp(score)), reasons };
}

export function scoreAdditives(a: AdditiveAnalysis, hasIngredients: boolean): Omit<SubScore, 'key' | 'weight'> {
  if (!hasIngredients) return { score: null, reasons: [{ code: 'score.noIngredients' }] };
  let score = 100;
  const reasons: ScoreReason[] = [{ code: 'score.additives.base' }];
  for (const level of ['limited', 'moderate', 'high'] as const) {
    const count = a.countsByConcern[level];
    if (count > 0) {
      const delta = -count * ADDITIVE_PENALTY[level];
      score += delta;
      reasons.push({ code: `score.additives.${level}`, delta, params: { count, each: ADDITIVE_PENALTY[level] } });
    }
  }
  if (a.unknownCount > 0) {
    const delta = -a.unknownCount * ADDITIVE_PENALTY.limited;
    score += delta;
    reasons.push({ code: 'score.additives.unknown', delta, params: { count: a.unknownCount } });
  }
  return { score: r0(clamp(score)), reasons };
}

export function scoreProcessing(p: ProcessingAnalysis, fats: FatAnalysis): Omit<SubScore, 'key' | 'weight'> {
  if (p.nova === undefined) return { score: null, reasons: [{ code: 'score.noIngredients' }] };
  let score: number = NOVA_BASE[p.nova];
  const reasons: ScoreReason[] = [{ code: 'score.processing.base', params: { nova: p.nova, base: score } }];
  const extra = Math.max(0, p.ingredientCount - PROCESSING.ingredientAllowance);
  if (extra > 0) {
    const delta = -r0(Math.min(PROCESSING.maxIngredientPenalty, extra * PROCESSING.perExtraIngredient));
    score += delta;
    reasons.push({ code: 'score.processing.ingredients', delta, params: { count: p.ingredientCount } });
  }
  if (fats.hydrogenated) {
    score -= PROCESSING.hydrogenatedPenalty;
    reasons.push({ code: 'score.processing.hydrogenated', delta: -PROCESSING.hydrogenatedPenalty });
  }
  if (fats.palm) {
    score -= PROCESSING.palmPenalty;
    reasons.push({ code: 'score.processing.palm', delta: -PROCESSING.palmPenalty });
  }
  return { score: r0(clamp(score)), reasons };
}

export function scoreClaim(c: ClaimCheck): Omit<SubScore, 'key' | 'weight'> {
  if (c.status === 'unknown') return { score: null, reasons: [{ code: 'score.noData' }] };
  const map: Record<Exclude<typeof c.status, 'unknown'>, number> = {
    meets: CLAIM_SCORE.meets,
    noClaim: CLAIM_SCORE.noClaim,
    partial: c.claim === 'high' ? CLAIM_SCORE.claimedHighButOnlySource : CLAIM_SCORE.impliedButOnlySource,
    fails: CLAIM_SCORE.fails,
  };
  return { score: map[c.status], reasons: [{ code: `score.claim.${c.status}`, params: { claim: c.claim } }] };
}

export function computeScore(input: ScoreInputs): ScoreResult {
  const parts: Record<SubScoreKey, Omit<SubScore, 'key' | 'weight'>> = {
    proteinDensity: scoreDensity(input.density, input.quality),
    proteinQuality: scoreQuality(input.quality, input.spiking, input.hasIngredients),
    sugar: scoreSugar(input.sugars, input.fillers),
    additives: scoreAdditives(input.additives, input.hasIngredients),
    processing: scoreProcessing(input.processing, input.fats),
    claimAccuracy: scoreClaim(input.claim),
  };
  const subScores: SubScore[] = SUB_SCORE_KEYS.map((key) => ({ key, weight: SCORE_WEIGHTS[key], ...parts[key] }));
  const available = subScores.filter((s) => s.score !== null);
  const coverage = round(available.reduce((acc, s) => acc + s.weight, 0), 2);
  const confidence = coverage >= 0.99 ? 'high' : coverage >= 0.7 ? 'medium' : 'low';
  const densityKnown = parts.proteinDensity.score !== null;
  if (!densityKnown || coverage === 0) return { subScores, coverage, confidence: 'low' };
  const total = r0(available.reduce((acc, s) => acc + (s.score ?? 0) * s.weight, 0) / coverage);
  return { total, grade: gradeFor(total), subScores, coverage, confidence };
}
