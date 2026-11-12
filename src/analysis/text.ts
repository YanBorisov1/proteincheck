/** Text helpers for ingredient lists (pure). */

/** Lower-cases, strips accents and normalises whitespace/punctuation variants. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‐-―]/g, '-')
    .replace(/[_*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Ingredient {
  /** Text as written (trimmed). */
  text: string;
  /** Normalised text for matching. */
  norm: string;
  /** Percentage when declared, e.g. "whey protein (35%)". */
  percent?: number;
  /** Nested sub-ingredients, e.g. the contents of "protein blend (whey, casein)". */
  children: Ingredient[];
  /** 0-based position among the top-level ingredients (order = descending weight). */
  position: number;
  /** Nesting depth: 0 for top-level ingredients (set by flattenIngredients). */
  depth?: number;
}

/** Splits on commas/semicolons that are not inside brackets. */
export function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

const PERCENT_RE = /(\d+(?:[.,]\d+)?)\s*%/;

function parseOne(raw: string, position: number): Ingredient {
  const cleaned = raw.replace(/^[\s.:]+|[\s.]+$/g, '');
  const open = cleaned.search(/[([]/);
  let head = cleaned;
  let inner = '';
  if (open >= 0) {
    head = cleaned.slice(0, open);
    const close = Math.max(cleaned.lastIndexOf(')'), cleaned.lastIndexOf(']'));
    inner = cleaned.slice(open + 1, close > open ? close : undefined);
    const after = close > open ? cleaned.slice(close + 1) : '';
    head = `${head} ${after}`.trim();
  }
  const pctMatch = cleaned.match(PERCENT_RE);
  const children =
    inner && splitTopLevel(inner).length > 0 && !/^\s*\d+(?:[.,]\d+)?\s*%\s*$/.test(inner)
      ? splitTopLevel(inner).map((c, i) => parseOne(c, i))
      : [];
  const ingredient: Ingredient = {
    text: cleaned,
    norm: normalize(head || cleaned),
    children,
    position,
  };
  if (pctMatch?.[1]) ingredient.percent = Number(pctMatch[1].replace(',', '.'));
  return ingredient;
}

/** Strips a leading "Ingredients:" heading and trailing allergen/trace statements. */
export function cleanIngredientsText(text: string): string {
  return text
    .replace(/^\s*(ingredients?|ingr[eé]dients?|zutaten|ingredientes|ingredienti)\s*[:\-]\s*/i, '')
    .replace(/\b(may contain|contains traces|kann spuren|peut contenir|puede contener)\b[\s\S]*$/i, '')
    .trim();
}

/** Parses an ingredient list into a tree. Ingredient order is preserved. */
export function parseIngredients(text: string): Ingredient[] {
  const cleaned = cleanIngredientsText(text);
  if (!cleaned) return [];
  return splitTopLevel(cleaned).map((p, i) => parseOne(p, i));
}

/** Depth-first flattening; children inherit their parent's top-level position. */
export function flattenIngredients(list: Ingredient[]): Ingredient[] {
  const out: Ingredient[] = [];
  const walk = (items: Ingredient[], topPos: number | null, depth: number) => {
    for (const item of items) {
      const pos = topPos ?? item.position;
      out.push({ ...item, position: pos, depth });
      walk(item.children, pos, depth + 1);
    }
  };
  walk(list, null, 0);
  return out;
}

export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation over sorted [x, y] points, clamped at both ends. */
export function piecewise(x: number, points: ReadonlyArray<readonly [number, number]>): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b && x <= b[0]) {
      return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
    }
  }
  return last[1];
}
