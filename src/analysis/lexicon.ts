/**
 * Ingredient vocabulary used by all detectors. Patterns are regex sources
 * matched case-insensitively against ingredient text (word-boundary aware).
 */

export type TermCategory =
  | 'protein'
  | 'sugar'
  | 'sugarAlcohol'
  | 'sweetener'
  | 'filler'
  | 'isolatedFiber'
  | 'spiking'
  | 'palm'
  | 'hydrogenated'
  | 'blend';

export interface Term {
  id: string;
  category: TermCategory;
  pattern: string;
}

export function termRegex(pattern: string, flags = 'i'): RegExp {
  return new RegExp(`(?<![a-z])(?:${pattern})(?![a-z])`, flags);
}

export function matchesTerm(text: string, pattern: string): boolean {
  return termRegex(pattern).test(text);
}

// ---------------------------------------------------------------- protein sources

export type ProteinSourceId =
  | 'whey'
  | 'casein'
  | 'milk'
  | 'egg'
  | 'soy'
  | 'pea'
  | 'rice'
  | 'wheat'
  | 'collagen'
  | 'hemp'
  | 'fava'
  | 'potato'
  | 'oat'
  | 'nut'
  | 'beef'
  | 'mycoprotein'
  | 'insect';

export interface ProteinSource {
  id: ProteinSourceId;
  pattern: string;
  /** Approximate PDCAAS range (truncated at 1.0). */
  pdcaas: readonly [number, number];
  /** Approximate DIAAS range (not truncated). */
  diaas: readonly [number, number];
  complete: boolean;
  /** Limiting amino acid(s) when incomplete or low quality. */
  limiting?: string;
  plant: boolean;
  animal: boolean;
}

/**
 * Values are approximate ranges compiled from FAO (2013) "Dietary protein quality
 * evaluation in human nutrition", Mathai et al. 2017, Herreman et al. 2020 and
 * related literature. They vary with processing and should be read as ballpark figures.
 */
export const PROTEIN_SOURCES: readonly ProteinSource[] = [
  { id: 'whey', pattern: 'whey(?: protein)?(?: isolate| concentrate| hydroly[sz]ate)?|lactoserum|molkenprotein|lactalbumin', pdcaas: [1, 1], diaas: [0.97, 1.25], complete: true, plant: false, animal: true },
  { id: 'casein', pattern: '(?:micellar )?casein(?:ate)?s?|(?:calcium|sodium|potassium) caseinate', pdcaas: [1, 1], diaas: [1.0, 1.45], complete: true, plant: false, animal: true },
  { id: 'milk', pattern: 'milk protein(?: concentrate| isolate)?|(?:skimmed |skim |whole )?milk powder|dried (?:skimmed )?milk|milk solids|quark|skyr|greek yog(?:h)?urt|yog(?:h)?urt|cottage cheese|(?<!coconut |almond |oat |soya? |rice |cocoa |cashew )(?:skimmed |skim |whole |semi-skimmed )?milk(?! chocolate| fat| flavou?r| alternative)', pdcaas: [1, 1], diaas: [1.1, 1.4], complete: true, plant: false, animal: true },
  { id: 'egg', pattern: 'egg(?: white)?(?: powder| protein)?s?|albumen|ovalbumin|egg albumin', pdcaas: [1, 1], diaas: [1.0, 1.13], complete: true, plant: false, animal: true },
  { id: 'soy', pattern: 'soy(?:a|bean)?(?! lecithin| oil| sauce)(?: protein)?(?: isolate| concentrate| crisps?| nuggets?)?|textured soy|tofu|edamame', pdcaas: [0.91, 1], diaas: [0.84, 0.98], complete: true, plant: true, animal: false },
  { id: 'pea', pattern: 'pea protein(?: isolate| concentrate)?|yellow pea', pdcaas: [0.78, 0.91], diaas: [0.66, 0.82], complete: false, limiting: 'methionine + cysteine', plant: true, animal: false },
  { id: 'rice', pattern: '(?:brown )?rice protein(?: isolate| concentrate)?', pdcaas: [0.42, 0.5], diaas: [0.37, 0.6], complete: false, limiting: 'lysine', plant: true, animal: false },
  { id: 'wheat', pattern: '(?:hydroly[sz]ed )?wheat protein(?: isolate)?|(?:vital )?wheat gluten|gluten(?![- ]free)|seitan', pdcaas: [0.25, 0.45], diaas: [0.25, 0.48], complete: false, limiting: 'lysine', plant: true, animal: false },
  { id: 'collagen', pattern: '(?:hydroly[sz]ed )?(?:bovine |marine |fish |porcine )?collagen(?: peptides?| hydroly[sz]ate)?|gelatine?|beef gelatin', pdcaas: [0, 0.08], diaas: [0, 0.05], complete: false, limiting: 'tryptophan (absent)', plant: false, animal: true },
  { id: 'hemp', pattern: 'hemp(?: seed)?(?: protein)?', pdcaas: [0.46, 0.63], diaas: [0.45, 0.65], complete: false, limiting: 'lysine', plant: true, animal: false },
  { id: 'fava', pattern: '(?:fava|faba) (?:bean )?protein', pdcaas: [0.6, 0.8], diaas: [0.55, 0.75], complete: false, limiting: 'methionine + cysteine', plant: true, animal: false },
  { id: 'potato', pattern: 'potato protein', pdcaas: [0.9, 1], diaas: [0.85, 1.0], complete: true, plant: true, animal: false },
  { id: 'oat', pattern: 'oat protein', pdcaas: [0.5, 0.6], diaas: [0.45, 0.6], complete: false, limiting: 'lysine', plant: true, animal: false },
  { id: 'nut', pattern: '(?:almond|peanut|cashew|pumpkin seed|sunflower seed) protein|peanut flour|almond flour', pdcaas: [0.4, 0.7], diaas: [0.4, 0.65], complete: false, limiting: 'lysine', plant: true, animal: false },
  { id: 'beef', pattern: 'beef protein(?: isolate)?|hydroly[sz]ed beef', pdcaas: [0.3, 0.9], diaas: [0.3, 0.9], complete: false, limiting: 'often mostly collagen (tryptophan)', plant: false, animal: true },
  { id: 'mycoprotein', pattern: 'mycoprotein', pdcaas: [0.91, 1], diaas: [0.85, 1.0], complete: true, plant: false, animal: false },
  { id: 'insect', pattern: '(?:cricket|mealworm|insect) (?:powder|protein|flour)', pdcaas: [0.7, 0.9], diaas: [0.6, 0.85], complete: true, plant: false, animal: true },
];

// ---------------------------------------------------------------- sugars & sweeteners

export const ADDED_SUGARS: readonly Term[] = [
  'glucose[- ]fructose syrup|fructose[- ]glucose syrup|isoglucose',
  'high[- ]fructose corn syrup|hfcs|corn syrup(?: solids)?',
  'glucose syrup(?: solids)?|dried glucose syrup',
  '(?:cane |brown |raw |coconut |beet |invert |icing |caster |powdered )?sugar(?! alcohol)s?|sucrose',
  'dextrose|glucose(?! syrup)|fructose(?! syrup)|maltose|lactose added|galactose',
  'honey|agave(?: syrup| nectar)?|maple syrup|golden syrup|(?:brown )?rice syrup|tapioca syrup|date syrup|molasses|treacle',
  'malt extract|barley malt(?: syrup| extract)?|caramel(?! colou?r)|fruit juice concentrate|concentrated (?:apple|grape|fruit) juice',
].map((pattern, i) => ({ id: `sugar${i}`, category: 'sugar' as const, pattern }));

export interface SugarAlcohol {
  id: string;
  name: string;
  pattern: string;
  eNumber?: string;
  /** Rough single-dose amount (g) above which many adults get digestive symptoms. */
  laxativeThresholdG: number;
  /** Relative glycaemic effect vs. sugar (approx.). */
  glycemicIndex: number;
  noteCode: string;
}

export const SUGAR_ALCOHOLS: readonly SugarAlcohol[] = [
  { id: 'maltitol', name: 'Maltitol', pattern: 'maltitol(?: syrup)?|e ?965', eNumber: 'E965', laxativeThresholdG: 30, glycemicIndex: 35, noteCode: 'polyol.maltitol' },
  { id: 'sorbitol', name: 'Sorbitol', pattern: 'sorbitol(?: syrup)?|e ?420', eNumber: 'E420', laxativeThresholdG: 20, glycemicIndex: 9, noteCode: 'polyol.sorbitol' },
  { id: 'xylitol', name: 'Xylitol', pattern: 'xylitol|e ?967', eNumber: 'E967', laxativeThresholdG: 40, glycemicIndex: 12, noteCode: 'polyol.xylitol' },
  { id: 'erythritol', name: 'Erythritol', pattern: 'erythritol|e ?968', eNumber: 'E968', laxativeThresholdG: 50, glycemicIndex: 0, noteCode: 'polyol.erythritol' },
  { id: 'isomalt', name: 'Isomalt', pattern: 'isomalt|e ?953', eNumber: 'E953', laxativeThresholdG: 30, glycemicIndex: 9, noteCode: 'polyol.isomalt' },
  { id: 'lactitol', name: 'Lactitol', pattern: 'lactitol|e ?966', eNumber: 'E966', laxativeThresholdG: 20, glycemicIndex: 6, noteCode: 'polyol.lactitol' },
  { id: 'mannitol', name: 'Mannitol', pattern: 'mannitol|e ?421', eNumber: 'E421', laxativeThresholdG: 20, glycemicIndex: 0, noteCode: 'polyol.mannitol' },
  { id: 'glycerol', name: 'Glycerol', pattern: 'glycerol|glycerine?|vegetable glycerine?|e ?422', eNumber: 'E422', laxativeThresholdG: 60, glycemicIndex: 3, noteCode: 'polyol.glycerol' },
];

export interface IntenseSweetener {
  id: string;
  name: string;
  pattern: string;
  eNumber?: string;
}

export const INTENSE_SWEETENERS: readonly IntenseSweetener[] = [
  { id: 'sucralose', name: 'Sucralose', pattern: 'sucralose|e ?955', eNumber: 'E955' },
  { id: 'acesulfame', name: 'Acesulfame K', pattern: 'acesulfame(?:[- ]?(?:k|potassium))?|e ?950', eNumber: 'E950' },
  { id: 'aspartame', name: 'Aspartame', pattern: 'aspartame|e ?951', eNumber: 'E951' },
  { id: 'cyclamate', name: 'Cyclamate', pattern: '(?:sodium )?cyclamate|e ?952', eNumber: 'E952' },
  { id: 'saccharin', name: 'Saccharin', pattern: '(?:sodium )?saccharin|e ?954', eNumber: 'E954' },
  { id: 'thaumatin', name: 'Thaumatin', pattern: 'thaumatin|e ?957', eNumber: 'E957' },
  { id: 'steviol', name: 'Steviol glycosides (stevia)', pattern: 'steviol glycosides?|stevia(?: extract| leaf extract)?|rebaudioside a?|reb a|e ?960a?', eNumber: 'E960' },
  { id: 'neotame', name: 'Neotame', pattern: 'neotame|e ?961', eNumber: 'E961' },
  { id: 'aspartame-acesulfame', name: 'Aspartame-acesulfame salt', pattern: 'aspartame[- ]acesulfame salt|e ?962', eNumber: 'E962' },
  { id: 'advantame', name: 'Advantame', pattern: 'advantame|e ?969', eNumber: 'E969' },
  { id: 'monkfruit', name: 'Monk fruit (mogrosides)', pattern: 'monk ?fruit(?: extract)?|luo han guo|mogrosides?', },
  { id: 'allulose', name: 'Allulose (rare sugar)', pattern: 'allulose|d-psicose|psicose' },
];

// ---------------------------------------------------------------- fillers & isolated fibres

export const FILLERS: readonly Term[] = [
  { id: 'maltodextrin', category: 'filler', pattern: 'maltodextrine?' },
  { id: 'glucoseSyrup', category: 'filler', pattern: 'glucose syrup(?: solids)?|dried glucose syrup|corn syrup solids' },
  { id: 'dextrin', category: 'filler', pattern: '(?<!resistant |resistent )dextrin' },
  { id: 'modifiedStarch', category: 'filler', pattern: 'modified (?:corn |maize |tapioca |potato |wheat )?starch' },
  { id: 'starch', category: 'filler', pattern: '(?:corn|maize|tapioca|potato|wheat|rice) starch' },
  { id: 'riceCrisps', category: 'filler', pattern: '(?:crisp(?:ed|y)? rice|rice crisps?|puffed rice)(?! protein)' },
  { id: 'imo', category: 'filler', pattern: 'isomalto[- ]?oligosaccharides?|imo' },
  { id: 'polydextrose', category: 'isolatedFiber', pattern: 'polydextrose|e ?1200' },
  { id: 'solubleCornFiber', category: 'isolatedFiber', pattern: 'soluble (?:corn|maize|tapioca) fib(?:er|re)' },
  { id: 'resistantDextrin', category: 'isolatedFiber', pattern: 'resistant (?:dextrin|maltodextrin|starch)|fibersol' },
  { id: 'inulin', category: 'isolatedFiber', pattern: 'inulin|chicory (?:root )?(?:fib(?:er|re)|extract)|oligofructose|fructo-?oligosaccharides?|fos' },
  { id: 'gos', category: 'isolatedFiber', pattern: 'galacto-?oligosaccharides?|gos' },
];

// ---------------------------------------------------------------- amino spiking

export interface SpikingAgent {
  id: string;
  name: string;
  pattern: string;
  /** True for compounds that are not protein-building amino acids at all. */
  nonProtein: boolean;
}

export const SPIKING_AGENTS: readonly SpikingAgent[] = [
  { id: 'glycine', name: 'Glycine', pattern: 'l-?glycine|glycine', nonProtein: false },
  { id: 'taurine', name: 'Taurine', pattern: 'taurine', nonProtein: true },
  { id: 'creatine', name: 'Creatine', pattern: 'creatine(?: monohydrate| hcl)?', nonProtein: true },
  { id: 'glutamine', name: 'L-Glutamine', pattern: 'l-?glutamine|glutamine', nonProtein: false },
  { id: 'arginine', name: 'Arginine', pattern: 'l-?arginine(?: akg| alpha-ketoglutarate)?|arginine', nonProtein: false },
  { id: 'alanine', name: 'Alanine / beta-alanine', pattern: '(?:beta-|β-)?alanine|l-alanine', nonProtein: false },
  { id: 'citrulline', name: 'Citrulline', pattern: 'l-?citrulline(?: malate)?|citrulline', nonProtein: true },
  { id: 'ornithine', name: 'Ornithine', pattern: 'l-?ornithine|ornithine', nonProtein: true },
  { id: 'glutamicAcid', name: 'Glutamic acid', pattern: 'glutamic acid|l-glutamic acid', nonProtein: false },
  { id: 'bcaa', name: 'Added BCAAs (leucine/isoleucine/valine)', pattern: 'bcaas?|branched[- ]chain amino acids?|l-?leucine|l-?isoleucine|l-?valine', nonProtein: false },
  { id: 'aminoBlend', name: 'Free amino acid blend', pattern: 'amino acid (?:blend|matrix|complex)|free[- ]form amino acids?', nonProtein: false },
];

// ---------------------------------------------------------------- fats

export const PALM_PATTERN =
  'palm(?: kernel)?(?: oil| fat| stearin| olein)?s?|(?:vegetable (?:oil|fat)s?) \\((?:[^)]*\\b)?palm|palmitate(?! ascorbyl)';
export const HYDROGENATED_PATTERN = '(?:partially |fully |part-)?hydrogenated(?: vegetable)?(?: oils?| fats?)?|interesterified';
export const PARTIALLY_HYDROGENATED_PATTERN = '(?:partially|part-) ?hydrogenated';
export const UNSPECIFIED_VEG_FAT_PATTERN = 'vegetable (?:oils?|fats?)(?! \\()';

// ---------------------------------------------------------------- blends

export const BLEND_PATTERN =
  '(?:proprietary |protein |amino |performance |energy |recovery |muscle |anabolic )?(?:blend|matrix|complex)(?! of)';

// ---------------------------------------------------------------- ultra-processing markers (NOVA 4 estimate)

export const UPF_MARKERS: readonly string[] = [
  'protein isolate|isolate',
  'hydroly[sz]ed|hydroly[sz]ate',
  'maltodextrine?|glucose syrup|corn syrup|invert sugar|isoglucose|dextrose',
  'flavou?rings?|aromas?|natural flavou?rs?|artificial flavou?rs?',
  'emulsifiers?|lecithins?|mono- and diglycerides',
  'modified starch|modified (?:corn|maize|tapioca|potato) starch',
  'hydrogenated|interesterified',
  'colou?rs?|colou?ring',
  'thickeners?|stabili[sz]ers?|humectants?|bulking agents?|glazing agents?|anti-?caking agents?',
  'polydextrose|soluble (?:corn|tapioca) fib(?:er|re)|isomalto[- ]?oligosaccharides?|inulin',
  'sucralose|acesulfame|aspartame|steviol|cyclamate|saccharin',
  'maltitol|sorbitol|erythritol|xylitol|isomalt',
  'e ?\\d{3,4}[a-z]?',
];

export const CULINARY_ONLY: readonly string[] = ['sugar', 'salt', 'oil', 'butter', 'honey', 'vinegar', 'starch'];
