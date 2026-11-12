/**
 * Parses OCR text from a photographed nutrition table and ingredient list.
 * Tolerant of OCR noise, comma decimals, kJ/kcal pairs and multiple columns
 * (per 100 g is assumed to be the first numeric column, as on EU labels).
 */
import type { Nutriments } from './types';
import { round } from './text';

export interface ParsedLabel {
  nutriments: Nutriments;
  servingSizeG?: number;
  /** Which fields were found, for the review screen. */
  found: Array<keyof Nutriments | 'servingSizeG'>;
}

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;

/** Common OCR confusions inside numbers: O→0, l/I→1, S→5 when surrounded by digits. */
export function cleanOcrText(text: string): string {
  return text
    .replace(/(?<=\d)[oO](?=\d|\s?g\b)/g, '0')
    .replace(/(?<=\d)[lI](?=\d|[.,]\d)/g, '1')
    .replace(/(?<=\s)[oO](?=[.,]\d)/g, '0')
    .replace(/<\s?(?=\d)/g, '')
    .replace(/[|]/g, ' ')
    .replace(/[ \t]+/g, ' ');
}

const toNum = (s: string | undefined): number | undefined => {
  if (s === undefined) return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

type NumericKey = Exclude<keyof Nutriments, 'energyKcal100g'>;

const FIELDS: ReadonlyArray<{ key: NumericKey; re: RegExp; max: number }> = [
  // Order matters: more specific rows first.
  { key: 'saturatedFat100g', re: /(?:of which )?(?:saturate[sd]?|saturated fat|sat\.? fat|ges[aä]ttigte|satur[ée]s|saturad[oa]s)[^\d\n]*/i, max: 100 },
  { key: 'transFat100g', re: /trans[- ]?fat[^\d\n]*/i, max: 100 },
  { key: 'addedSugars100g', re: /added sugars?[^\d\n]*/i, max: 100 },
  { key: 'polyols100g', re: /(?:of which )?(?:polyols?|sugar alcohols?|mehrwertige alkohole|polyalcools?)[^\d\n]*/i, max: 100 },
  { key: 'sugars100g', re: /(?:of which )?(?<!added )(?:total )?(?:sugars?|zucker|sucres?|az[uú]cares?)(?! alcohol)[^\d\n]*/i, max: 100 },
  { key: 'fiber100g', re: /(?:dietary )?(?:fib(?:re|er)s?|ballaststoffe|fibres alimentaires|fibra)[^\d\n]*/i, max: 100 },
  { key: 'proteins100g', re: /(?:proteins?|eiwei(?:ss|ß)|prot[ée]ines?|prote[ií]nas?)[^\d\n]*/i, max: 100 },
  { key: 'carbohydrates100g', re: /(?:total )?(?:carbohydrates?|carbs?|kohlenhydrate|glucides|hidratos de carbono)[^\d\n]*/i, max: 100 },
  { key: 'fat100g', re: /(?:total )?(?:fat|fett|mati[eè]res grasses|l[ií]pidos|grasas)(?! ?\w*free)[^\d\n]*/i, max: 100 },
  { key: 'salt100g', re: /(?:salt|salz|sel|sal)\b[^\d\n]*/i, max: 100 },
  { key: 'sodium100g', re: /(?:sodium|natrium)[^\d\n]*/i, max: 100 },
];

export function parseNutritionText(raw: string): ParsedLabel {
  const text = cleanOcrText(raw);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const nutriments: Nutriments = {};
  const found: ParsedLabel['found'] = [];

  // Energy: prefer an explicit kcal figure, else convert kJ.
  for (const line of lines) {
    if (nutriments.energyKcal100g !== undefined) break;
    if (!/energ|kcal|kj|calor/i.test(line)) continue;
    const kcal = line.match(new RegExp(`${NUM}\\s?kcal`, 'i'));
    const kj = line.match(new RegExp(`${NUM}\\s?kj`, 'i'));
    const kcalVal = toNum(kcal?.[1]);
    const kjVal = toNum(kj?.[1]);
    if (kcalVal !== undefined && kcalVal < 950) nutriments.energyKcal100g = kcalVal;
    else if (kjVal !== undefined && kjVal < 4000) nutriments.energyKcal100g = round(kjVal / 4.184, 0);
    else if (/calories/i.test(line)) {
      const plain = toNum(line.match(new RegExp(NUM))?.[1]);
      if (plain !== undefined && plain < 950) nutriments.energyKcal100g = plain;
    }
    if (nutriments.energyKcal100g !== undefined) found.push('energyKcal100g');
  }

  const usedLines = new Set<number>();
  for (const field of FIELDS) {
    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue;
      const line = lines[i] ?? '';
      const m = line.match(field.re);
      if (!m || m.index === undefined) continue;
      const rest = line.slice(m.index + m[0].length);
      const valueMatch = rest.match(new RegExp(`^${NUM}\\s?(mg|g)?`, 'i'));
      let value = toNum(valueMatch?.[1]);
      if (value === undefined) continue;
      if (valueMatch?.[2]?.toLowerCase() === 'mg') value = value / 1000;
      if (value > field.max) continue;
      nutriments[field.key] = round(value, 2);
      found.push(field.key);
      usedLines.add(i);
      break;
    }
  }
  if (nutriments.salt100g === undefined && nutriments.sodium100g !== undefined) {
    nutriments.salt100g = round(nutriments.sodium100g * 2.5, 2);
  }

  const result: ParsedLabel = { nutriments, found };
  const serving = text.match(
    new RegExp(String.raw`(?:serving size|per serving|portion|per bar|per scoop|per pot|per bottle|pro portion|par portion)[^\d\n]{0,20}${NUM}\s?(g|ml)`, 'i'),
  );
  const servingG = toNum(serving?.[1]);
  if (servingG !== undefined && servingG > 0 && servingG < 2000) {
    result.servingSizeG = servingG;
    found.push('servingSizeG');
  }
  return result;
}

const ING_START = /(ingredients?|ingr[ée]dients?|zutaten|ingredientes|ingredienti)\s*[:\-.]?/i;
const ING_END = /\n\s*\n|(?:allergy advice|allergens?|may contain|nutrition(?:al)? (?:information|facts)|storage|store in|best before|n[äa]hrwert|valeurs nutritionnelles)/i;

/** Extracts the ingredient list paragraph from OCR text and joins wrapped lines. */
export function parseIngredientsFromOcr(raw: string): string {
  const text = raw.replace(/\r/g, '');
  const start = text.match(ING_START);
  let body = start && start.index !== undefined ? text.slice(start.index + start[0].length) : text;
  const end = body.search(ING_END);
  if (end > 0) body = body.slice(0, end);
  return body
    .replace(/-\n(?=[a-z])/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.)])/g, '$1')
    .trim()
    .replace(/\.$/, '');
}
