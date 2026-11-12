/** Core domain types shared by the analysis engine and the UI. */

export interface Nutriments {
  energyKcal100g?: number;
  proteins100g?: number;
  carbohydrates100g?: number;
  sugars100g?: number;
  addedSugars100g?: number;
  polyols100g?: number;
  fat100g?: number;
  saturatedFat100g?: number;
  transFat100g?: number;
  fiber100g?: number;
  salt100g?: number;
  sodium100g?: number;
}

export type NovaGroup = 1 | 2 | 3 | 4;
export type ProductSource = 'off' | 'ocr' | 'manual';

export interface Product {
  /** Barcode when known, otherwise a generated local id. */
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  quantity?: string;
  /** Net package weight in grams, when known. */
  packageSizeG?: number;
  servingSizeG?: number;
  ingredientsText: string;
  nutriments: Nutriments;
  novaGroup?: NovaGroup;
  /** Normalised allergen ids, e.g. "milk", "soy". */
  allergenTags: string[];
  tracesTags: string[];
  /** Label / claim tags or text, e.g. "en:high-proteins", "vegan". */
  labels: string[];
  categories: string[];
  /** Open Food Facts ingredients_analysis_tags, e.g. "en:vegan". */
  analysisTags: string[];
  source: ProductSource;
  fetchedAt: number;
}

export type Severity = 'good' | 'info' | 'warn' | 'bad';

/** A single explained observation. `code` maps to a translatable message. */
export interface Finding {
  code: string;
  severity: Severity;
  /** Importance 1–10, used to rank the top red flags / good points. */
  weight: number;
  params?: Record<string, string | number>;
}

export type Concern = 'none' | 'limited' | 'moderate' | 'high';

export interface AdditiveEntry {
  id: string; // e.g. "E322" or a slug for named additives without E-number
  eNumber?: string;
  name: string;
  synonyms: string[];
  category: string;
  explanation: string;
  concern: Concern;
  source: string;
}

export interface DietaryPrefs {
  vegan: boolean;
  vegetarian: boolean;
  lactoseFree: boolean;
  glutenFree: boolean;
  nutFree: boolean;
  soyFree: boolean;
  eggFree: boolean;
}

export const DEFAULT_PREFS: DietaryPrefs = {
  vegan: false,
  vegetarian: false,
  lactoseFree: false,
  glutenFree: false,
  nutFree: false,
  soyFree: false,
  eggFree: false,
};

export interface AnalysisOptions {
  prefs?: DietaryPrefs;
  /** Price paid for the whole package (any currency). */
  price?: number;
  /** Package weight override in grams. */
  packageSizeG?: number;
}
