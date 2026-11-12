import { analyzeAdditives, type AdditiveAnalysis } from './additives';
import { analyzeAllergens, type AllergenAnalysis } from './allergens';
import { analyzeBlends, type BlendAnalysis } from './blends';
import { checkProteinClaim, type ClaimCheck } from './claims';
import { analyzeFats, type FatAnalysis } from './fats';
import { analyzeFillers, type FillerAnalysis } from './fillers';
import { analyzeProcessing, type ProcessingAnalysis } from './processing';
import { analyzeProteinDensity, type ProteinDensity } from './protein';
import { analyzeProteinQuality, detectAminoSpiking, type ProteinQuality, type SpikingResult } from './quality';
import { computeScore, type ScoreResult } from './scoring';
import { analyzeSalt, type SaltAnalysis } from './sodium';
import { analyzeSugars, type SugarAnalysis } from './sugars';
import { flattenIngredients, parseIngredients, type Ingredient } from './text';
import type { AnalysisOptions, Finding, Product } from './types';
import { analyzeValue, type ValueAnalysis } from './value';

export interface AnalysisResult {
  product: Product;
  ingredients: Ingredient[];
  density: ProteinDensity;
  claim: ClaimCheck;
  quality: ProteinQuality;
  spiking: SpikingResult;
  sugars: SugarAnalysis;
  fats: FatAnalysis;
  fillers: FillerAnalysis;
  salt: SaltAnalysis;
  additives: AdditiveAnalysis;
  processing: ProcessingAnalysis;
  allergens: AllergenAnalysis;
  blends: BlendAnalysis;
  value: ValueAnalysis;
  score: ScoreResult;
  findings: Finding[];
  redFlags: Finding[];
  goodPoints: Finding[];
}

const SEVERITY_BOOST = { bad: 3, warn: 0, good: 0, info: -5 } as const;

/** Ranks findings by importance; ties favour more severe ones. */
export function rankFindings(findings: Finding[], kind: 'bad' | 'good', limit = 3): Finding[] {
  const pool = findings.filter((f) => (kind === 'bad' ? f.severity === 'bad' || f.severity === 'warn' : f.severity === 'good'));
  return [...pool].sort((a, b) => b.weight + SEVERITY_BOOST[b.severity] - (a.weight + SEVERITY_BOOST[a.severity])).slice(0, limit);
}

/** Runs every analysis on a product. Pure: same input → same output. */
export function analyzeProduct(product: Product, options: AnalysisOptions = {}): AnalysisResult {
  const ingredients = parseIngredients(product.ingredientsText);
  const flat = flattenIngredients(ingredients);
  const n = product.nutriments;

  const density = analyzeProteinDensity(product);
  const claim = checkProteinClaim(product, density.energyPct);
  const quality = analyzeProteinQuality(flat);
  const spiking = detectAminoSpiking(flat, quality.sources.length > 0);
  const sugars = analyzeSugars(n, flat);
  const fats = analyzeFats(n, flat, product.ingredientsText);
  const fillers = analyzeFillers(n, flat);
  const salt = analyzeSalt(product);
  const additives = analyzeAdditives(flat);
  const processing = analyzeProcessing(product, ingredients, flat);
  const allergens = analyzeAllergens(product, flat, options.prefs);
  const blends = analyzeBlends(flat);
  const value = analyzeValue(options.price, options.packageSizeG ?? product.packageSizeG, n.proteins100g);
  const score = computeScore({
    density,
    quality,
    spiking,
    sugars,
    fillers,
    additives,
    processing,
    fats,
    claim,
    hasIngredients: ingredients.length > 0,
  });

  const findings = [
    ...allergens.findings,
    ...claim.findings,
    ...density.findings,
    ...quality.findings,
    ...spiking.findings,
    ...sugars.findings,
    ...fats.findings,
    ...fillers.findings,
    ...salt.findings,
    ...additives.findings,
    ...processing.findings,
    ...blends.findings,
  ];

  return {
    product,
    ingredients,
    density,
    claim,
    quality,
    spiking,
    sugars,
    fats,
    fillers,
    salt,
    additives,
    processing,
    allergens,
    blends,
    value,
    score,
    findings,
    redFlags: rankFindings(findings, 'bad'),
    goodPoints: rankFindings(findings, 'good'),
  };
}

export * from './types';
export * from './config';
export type { Ingredient } from './text';
export type { ScoreResult, SubScore, ScoreReason } from './scoring';
export type { DietStatus, AllergenId } from './allergens';
