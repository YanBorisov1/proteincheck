/**
 * Identify a product from the words printed on the front of its pack (pure, tested).
 *
 * The camera photo is read with OCR on the device. Big, confidently read words are
 * usually the brand and product name, so they get the most weight in the search.
 * Candidates from Open Food Facts are then ranked by how many of those words they
 * contain (tolerating small OCR misreads). The user confirms the match, so the
 * analysis always uses a real database record, never a guess.
 */
import { normalize } from './text';

export interface OcrWord {
  text: string;
  /** 0–100 as reported by the OCR engine. */
  confidence: number;
  /** Height of the word's bounding box in pixels (bigger = more prominent on the pack). */
  height: number;
}

export interface QueryToken {
  token: string;
  weight: number;
}

const MIN_CONFIDENCE = 55;

/** Words that say nothing about which product it is. */
const STOP_WORDS = new Set(
  (
    'the and with for per net weight wt contains ingredients nutrition nutritional information energy kcal ' +
    'serving servings each approx typical values best before use store keep cool dry place www com made ' +
    'produced packed product of in on to a an by from our your you this that it is are be or no not'
  ).split(' '),
);

/** Common pack words: kept, but they barely narrow the search. */
const GENERIC_WORDS = new Set(
  (
    'protein proteins bar bars powder shake shakes drink drinks snack snacks high low sugar sugars free added ' +
    'source rich gluten vegan vegetarian natural naturally flavour flavor flavoured flavored taste tasty ' +
    'delicious real premium original new plus more less only recipe grams fibre fiber whey isolate ' +
    'chocolate vanilla strawberry caramel peanut butter cookie cookies cream salted milk'
  ).split(' '),
);

/** Cleans an OCR word; returns null for noise, numbers and stop words. */
export function cleanToken(raw: string): string | null {
  const t = normalize(raw).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
  if (t.length < 3) return null;
  const letters = (t.match(/[a-z]/g) ?? []).length;
  if (letters < 3 || letters / t.length < 0.7) return null;
  if (STOP_WORDS.has(t)) return null;
  return t;
}

/** Turns OCR words into weighted search tokens, most distinctive first. */
export function buildQuery(words: OcrWord[], maxTokens = 8): QueryToken[] {
  const weights = new Map<string, number>();
  for (const w of words) {
    if (w.confidence < MIN_CONFIDENCE) continue;
    // A word may contain several tokens ("PROTEIN-BAR").
    for (const part of w.text.split(/[\s\-–/|,.:;]+/)) {
      const token = cleanToken(part);
      if (!token) continue;
      const base = Math.max(1, w.height) * (w.confidence / 100);
      const weight = base * (GENERIC_WORDS.has(token) ? 0.25 : 1);
      weights.set(token, Math.max(weights.get(token) ?? 0, weight));
    }
  }
  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxTokens)
    .map(([token, weight]) => ({ token, weight: Math.round(weight * 10) / 10 }));
}

/** Tokens typed by the user (all equally important). */
export function queryFromText(text: string, maxTokens = 8): QueryToken[] {
  const seen = new Set<string>();
  const out: QueryToken[] = [];
  for (const part of text.split(/[\s\-–/|,.:;]+/)) {
    const token = cleanToken(part);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push({ token, weight: GENERIC_WORDS.has(token) ? 0.25 : 1 });
  }
  return out.slice(0, maxTokens);
}

/**
 * Search strings to try, from most specific to broadest. Generic words are
 * left out of the narrow queries because they match thousands of products.
 */
export function searchQueries(tokens: QueryToken[]): string[] {
  const specific = tokens.filter((t) => !GENERIC_WORDS.has(t.token)).map((t) => t.token);
  const all = tokens.map((t) => t.token);
  const candidates = [
    specific.slice(0, 4).join(' '),
    [...specific.slice(0, 2), ...all.filter((t) => GENERIC_WORDS.has(t)).slice(0, 1)].join(' '),
    specific.slice(0, 2).join(' '),
    specific[0] ?? '',
    all.slice(0, 3).join(' '),
  ];
  return [...new Set(candidates.map((q) => q.trim()).filter((q) => q.length >= 3))];
}

/** Levenshtein distance capped at `max` (cheap early exit). */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length] ?? max + 1;
}

/** True when a query token matches a word, allowing for OCR misreads. */
export function tokenMatches(token: string, word: string): boolean {
  if (token === word) return true;
  if (token.length >= 4 && word.length >= 4 && (word.startsWith(token) || token.startsWith(word))) return true;
  if (token.length >= 5) return editDistance(token, word, token.length >= 8 ? 2 : 1) <= (token.length >= 8 ? 2 : 1);
  return false;
}

export interface Candidate {
  barcode: string;
  name: string;
  brand?: string;
}

export interface RankedCandidate<C extends Candidate> {
  candidate: C;
  /** 0–1 share of the weighted query found in the candidate's name and brand. */
  score: number;
}

/** Ranks candidates by weighted token overlap with their name + brand. Stable for ties. */
export function rankCandidates<C extends Candidate>(tokens: QueryToken[], candidates: C[]): Array<RankedCandidate<C>> {
  const total = tokens.reduce((s, t) => s + t.weight, 0);
  const seen = new Set<string>();
  const ranked: Array<RankedCandidate<C> & { index: number }> = [];
  candidates.forEach((candidate, index) => {
    if (seen.has(candidate.barcode)) return;
    seen.add(candidate.barcode);
    const words = normalize(`${candidate.brand ?? ''} ${candidate.name}`).split(/[^a-z0-9]+/).filter(Boolean);
    const matched = tokens.reduce((s, t) => s + (words.some((w) => tokenMatches(t.token, w)) ? t.weight : 0), 0);
    ranked.push({ candidate, score: total > 0 ? Math.round((matched / total) * 100) / 100 : 0, index });
  });
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.map(({ candidate, score }) => ({ candidate, score }));
}

/** How sure we are about the best match, to decide what to tell the user. */
export function matchConfidence(scores: number[]): 'strong' | 'possible' | 'weak' {
  const [best = 0, second = 0] = scores;
  if (best >= 0.6 && best - second >= 0.15) return 'strong';
  if (best >= 0.35) return 'possible';
  return 'weak';
}
