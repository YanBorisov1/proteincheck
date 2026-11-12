import { matchesTerm } from './lexicon';
import { normalize, type Ingredient } from './text';
import type { DietaryPrefs, Finding, Product } from './types';

export type AllergenId = 'milk' | 'soy' | 'gluten' | 'nuts' | 'peanuts' | 'egg';
export const ALLERGEN_IDS: readonly AllergenId[] = ['milk', 'soy', 'gluten', 'nuts', 'peanuts', 'egg'];

const ALLERGEN_PATTERNS: Record<AllergenId, string> = {
  milk: '(?<!coconut |almond |oat |soya? |rice |cashew )milk|whey|casein(?:ate)?s?|lactose|(?<!cocoa |shea |peanut |nut |almond |cashew |seed )butter(?!nut)|(?<!non-dairy )cream(?! of tartar)|yog(?:h)?urt|cheese|skyr|quark|lactoserum|ghee|lactalbumin',
  soy: 'soy(?:a|bean)?s?|tofu|edamame|tempeh|miso',
  gluten: 'wheat|barley|rye|spelt|kamut|triticale|malt(?!ol|itol|odextrin|ose)|gluten(?![- ]free)|semolina|couscous|seitan|oats?|oat flakes|bulgur',
  nuts: 'almonds?|hazelnuts?|cashews?|walnuts?|pecans?|pistachios?|macadamias?|brazil nuts?|nut butter|nuts|praline|marzipan|nougat',
  peanuts: 'peanuts?|groundnuts?|arachis',
  egg: 'eggs?|egg (?:white|yolk)|albumen|ovalbumin|egg albumin|lysozyme',
};

const OFF_TAG_MAP: Record<string, AllergenId> = {
  'en:milk': 'milk',
  'en:soybeans': 'soy',
  'en:gluten': 'gluten',
  'en:nuts': 'nuts',
  'en:peanuts': 'peanuts',
  'en:eggs': 'egg',
};

export function normalizeAllergenTag(tag: string): AllergenId | undefined {
  const t = tag.toLowerCase().trim();
  if (OFF_TAG_MAP[t]) return OFF_TAG_MAP[t];
  const bare = t.replace(/^[a-z]{2}:/, '');
  return (ALLERGEN_IDS as readonly string[]).includes(bare) ? (bare as AllergenId) : undefined;
}

export type DietStatus = 'yes' | 'no' | 'maybe';

export interface AllergenAnalysis {
  contains: AllergenId[];
  mayContain: AllergenId[];
  vegan: DietStatus;
  vegetarian: DietStatus;
  lactoseFree: DietStatus;
  glutenFree: DietStatus;
  /** Ingredients that make the product non-vegan / non-vegetarian. */
  animalIngredients: string[];
  findings: Finding[];
}

const MEAT_PATTERN = 'beef|pork|chicken|turkey|fish|anchov(?:y|ies)|tuna|salmon|gelatine?|collagen|lard|tallow|carmine|cochineal|e ?120|meat|bone broth|shellfish|shrimp|krill|fish oil';
const ANIMAL_NON_MEAT_PATTERN = `${ALLERGEN_PATTERNS.milk}|${ALLERGEN_PATTERNS.egg}|honey|beeswax|e ?901|shellac|e ?904|lanolin`;
const MAYBE_ANIMAL_PATTERN = 'vitamin d3|cholecalciferol|omega-?3|e ?471|mono- and diglycerides|natural flavou?rs?|l-?cysteine|e ?920';

export function analyzeAllergens(product: Product, flat: Ingredient[], prefs?: DietaryPrefs): AllergenAnalysis {
  const contains = new Set<AllergenId>();
  for (const tag of product.allergenTags) {
    const id = normalizeAllergenTag(tag);
    if (id) contains.add(id);
  }
  for (const id of ALLERGEN_IDS) {
    if (flat.some((i) => matchesTerm(i.norm, ALLERGEN_PATTERNS[id]))) contains.add(id);
  }
  const mayContain = new Set<AllergenId>();
  for (const tag of product.tracesTags) {
    const id = normalizeAllergenTag(tag);
    if (id && !contains.has(id)) mayContain.add(id);
  }

  const labels = normalize([...product.labels, ...product.analysisTags].join(' | '));
  const meat = flat.filter((i) => matchesTerm(i.norm, MEAT_PATTERN)).map((i) => i.text);
  const animal = flat.filter((i) => matchesTerm(i.norm, ANIMAL_NON_MEAT_PATTERN)).map((i) => i.text);
  const maybeAnimal = flat.some((i) => matchesTerm(i.norm, MAYBE_ANIMAL_PATTERN));
  const hasIngredients = flat.length > 0;

  let vegetarian: DietStatus = meat.length > 0 ? 'no' : hasIngredients ? 'yes' : 'maybe';
  let vegan: DietStatus = meat.length > 0 || animal.length > 0 ? 'no' : hasIngredients ? (maybeAnimal ? 'maybe' : 'yes') : 'maybe';
  if (/en:non-vegetarian/.test(labels)) vegetarian = 'no';
  if (/en:non-vegan/.test(labels)) vegan = 'no';
  if (vegan !== 'no' && /(?<!non-)vegan(?! ?-?status)/.test(labels) && !/maybe-vegan|vegan-status-unknown/.test(labels)) vegan = 'yes';
  if (vegetarian !== 'no' && /(?<!non-)vegetarian/.test(labels) && !/maybe-vegetarian|vegetarian-status-unknown/.test(labels)) vegetarian = 'yes';
  if (vegan === 'yes' && vegetarian !== 'no') vegetarian = 'yes';

  let lactoseFree: DietStatus;
  if (/lactose[- ]free|no-lactose|sans lactose|laktosefrei|sin lactosa/.test(labels)) lactoseFree = 'yes';
  else if (!contains.has('milk')) lactoseFree = hasIngredients ? 'yes' : 'maybe';
  else {
    const lowLactoseOnly = flat
      .filter((i) => matchesTerm(i.norm, ALLERGEN_PATTERNS.milk))
      .every((i) => /isolate|casein|caseinate|hydroly|lactase/.test(i.norm));
    lactoseFree = lowLactoseOnly ? 'maybe' : 'no';
  }

  let glutenFree: DietStatus;
  if (/gluten[- ]free|no-gluten|sans gluten|glutenfrei|sin gluten/.test(labels)) glutenFree = 'yes';
  else if (contains.has('gluten')) {
    const onlyOats = flat.filter((i) => matchesTerm(i.norm, ALLERGEN_PATTERNS.gluten)).every((i) => /\boats?\b/.test(i.norm));
    glutenFree = onlyOats ? 'maybe' : 'no';
  } else glutenFree = hasIngredients ? (mayContain.has('gluten') ? 'maybe' : 'yes') : 'maybe';

  const findings: Finding[] = [];
  if (prefs) {
    const conflict = (code: string, status: DietStatus) => {
      if (status === 'no') findings.push({ code, severity: 'bad', weight: 10 });
      else if (status === 'maybe') findings.push({ code: `${code}Maybe`, severity: 'warn', weight: 7 });
    };
    if (prefs.vegan) conflict('diet.notVegan', vegan);
    else if (prefs.vegetarian) conflict('diet.notVegetarian', vegetarian);
    if (prefs.lactoseFree) conflict('diet.notLactoseFree', lactoseFree);
    if (prefs.glutenFree) conflict('diet.notGlutenFree', glutenFree);
    const allergyPref: Array<[boolean, AllergenId[], string]> = [
      [prefs.nutFree, ['nuts', 'peanuts'], 'diet.containsNuts'],
      [prefs.soyFree, ['soy'], 'diet.containsSoy'],
      [prefs.eggFree, ['egg'], 'diet.containsEgg'],
    ];
    for (const [on, ids, code] of allergyPref) {
      if (!on) continue;
      if (ids.some((id) => contains.has(id))) findings.push({ code, severity: 'bad', weight: 10 });
      else if (ids.some((id) => mayContain.has(id))) findings.push({ code: `${code}Traces`, severity: 'warn', weight: 7 });
    }
  }
  return {
    contains: ALLERGEN_IDS.filter((id) => contains.has(id)),
    mayContain: ALLERGEN_IDS.filter((id) => mayContain.has(id)),
    vegan,
    vegetarian,
    lactoseFree,
    glutenFree,
    animalIngredients: [...new Set([...meat, ...animal])],
    findings,
  };
}
