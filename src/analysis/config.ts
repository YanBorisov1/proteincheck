/**
 * Every number that shapes a verdict lives here so it can be reviewed,
 * discussed and tuned in one place. The UI renders these values in
 * "Why this score?".
 */

/** Weights of the Protein Honesty Score. They must add up to 1. */
export const SCORE_WEIGHTS = {
  proteinDensity: 0.3,
  proteinQuality: 0.2,
  sugar: 0.2,
  additives: 0.1,
  processing: 0.1,
  claimAccuracy: 0.1,
} as const;

export type SubScoreKey = keyof typeof SCORE_WEIGHTS;

export const SUB_SCORE_KEYS = Object.keys(SCORE_WEIGHTS) as SubScoreKey[];

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';

/** Minimum score for each grade, best first. */
export const GRADE_THRESHOLDS: ReadonlyArray<readonly [Grade, number]> = [
  ['A', 80],
  ['B', 65],
  ['C', 50],
  ['D', 35],
  ['E', 0],
];

/** EU Regulation (EC) No 1924/2006, Annex: share of energy from protein. */
export const EU_CLAIMS = {
  sourceOfProteinPct: 12,
  highProteinPct: 20,
} as const;

/** Atwater / EU Regulation 1169/2011 Annex XIV energy conversion factors (kcal per g). */
export const ENERGY_FACTORS = {
  protein: 4,
  carbohydrate: 4,
  fat: 9,
  fiber: 2,
  polyol: 2.4,
} as const;

/** UK FSA front-of-pack "traffic light" thresholds per 100 g (foods). */
export const TRAFFIC_LIGHTS = {
  sugars: { low: 5, high: 22.5 },
  fat: { low: 3, high: 17.5 },
  saturatedFat: { low: 1.5, high: 5 },
  salt: { low: 0.3, high: 1.5 },
} as const;

/** EU reference intakes for an average adult (Regulation 1169/2011 Annex XIII). */
export const REFERENCE_INTAKES = {
  energyKcal: 2000,
  protein: 50,
  sugars: 90,
  fat: 70,
  saturatedFat: 20,
  salt: 6,
} as const;

/** Sugar grams per gram of protein. */
export const SUGAR_PROTEIN_RATIO = { good: 0.25, poor: 0.5, bad: 1 } as const;

/** Fibre per 100 g: EU "source of fibre" 3 g, "high fibre" 6 g. */
export const FIBER = { source: 3, high: 6 } as const;

/** Percent energy from protein → protein density sub-score. */
export const DENSITY_CURVE: ReadonlyArray<readonly [number, number]> = [
  [8, 0],
  [12, 25],
  [20, 50],
  [35, 80],
  [50, 95],
  [70, 100],
];

/** Points removed from the additives sub-score per additive by concern level. */
export const ADDITIVE_PENALTY = { none: 0, limited: 4, moderate: 12, high: 30 } as const;

/** Processing sub-score base by NOVA group. */
export const NOVA_BASE = { 1: 100, 2: 90, 3: 65, 4: 35 } as const;

export const PROCESSING = {
  /** Ingredients beyond this count cost points. */
  ingredientAllowance: 10,
  perExtraIngredient: 1.5,
  maxIngredientPenalty: 20,
  hydrogenatedPenalty: 25,
  palmPenalty: 5,
} as const;

export const QUALITY = {
  /** Points removed from protein quality per amino-spiking agent. */
  spikingPenalty: 15,
  maxSpikingPenalty: 45,
  /** Score used when protein sources cannot be identified. */
  unknownSourceScore: 50,
  /** Pea + rice (and similar plant pairs) complement each other's limiting amino acids. */
  complementaryPdcaas: 0.9,
  /**
   * Below this estimated PDCAAS, protein density is scored on quality-adjusted protein
   * (energy share × PDCAAS), so collagen-heavy products can't score as protein-dense.
   * Set low enough that decent plant proteins (pea, soy) are not penalised twice.
   */
  densityAdjustBelow: 0.75,
} as const;

export const SUGAR_SCORE = {
  /** Sugar g/100 g → penalty points (piecewise). */
  sugarCurve: [
    [5, 0],
    [10, 15],
    [22.5, 45],
    [40, 70],
  ] as ReadonlyArray<readonly [number, number]>,
  /** Sugar:protein ratio → penalty points (piecewise). */
  ratioCurve: [
    [0.25, 0],
    [0.5, 10],
    [1, 25],
    [2, 35],
  ] as ReadonlyArray<readonly [number, number]>,
  polyolHighG: 10,
  polyolPenalty: 8,
  maltitolPenalty: 7,
  intenseSweetenerPenalty: 3,
  fillerPenalty: 5,
} as const;

export const CLAIM_SCORE = {
  meets: 100,
  noClaim: 85,
  impliedButOnlySource: 65,
  claimedHighButOnlySource: 30,
  fails: 0,
} as const;
