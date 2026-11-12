import { ADDITIVES, E_NUMBER_RE, lookupENumber } from './additives';
import {
  ADDED_SUGARS,
  BLEND_PATTERN,
  FILLERS,
  HYDROGENATED_PATTERN,
  INTENSE_SWEETENERS,
  PALM_PATTERN,
  PROTEIN_SOURCES,
  SPIKING_AGENTS,
  SUGAR_ALCOHOLS,
  termRegex,
} from './lexicon';
import type { Concern } from './types';

export type HighlightKind =
  | 'protein'
  | 'proteinIncomplete'
  | 'spiking'
  | 'sugar'
  | 'polyol'
  | 'sweetener'
  | 'filler'
  | 'fiber'
  | 'fat'
  | 'blend'
  | 'additive';

export interface Segment {
  text: string;
  kind?: HighlightKind;
  /** Reference for the explanation sheet, e.g. "protein:whey", "additive:E322". */
  ref?: string;
  concern?: Concern;
}

interface Matcher {
  re: RegExp;
  kind: HighlightKind;
  ref: string;
  concern?: Concern;
  /** Higher wins when two matches overlap with equal length. */
  priority: number;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildMatchers(): Matcher[] {
  const m: Matcher[] = [];
  for (const s of PROTEIN_SOURCES) {
    m.push({ re: termRegex(s.pattern, 'gi'), kind: s.complete ? 'protein' : 'proteinIncomplete', ref: `protein:${s.id}`, priority: 5 });
  }
  for (const a of SPIKING_AGENTS) m.push({ re: termRegex(a.pattern, 'gi'), kind: 'spiking', ref: `spiking:${a.id}`, priority: 9 });
  for (const p of SUGAR_ALCOHOLS) m.push({ re: termRegex(p.pattern, 'gi'), kind: 'polyol', ref: `polyol:${p.id}`, priority: 8 });
  for (const s of INTENSE_SWEETENERS) m.push({ re: termRegex(s.pattern, 'gi'), kind: 'sweetener', ref: `sweetener:${s.id}`, priority: 8 });
  for (const f of FILLERS) {
    m.push({ re: termRegex(f.pattern, 'gi'), kind: f.category === 'isolatedFiber' ? 'fiber' : 'filler', ref: `filler:${f.id}`, priority: 7 });
  }
  for (const s of ADDED_SUGARS) m.push({ re: termRegex(s.pattern, 'gi'), kind: 'sugar', ref: 'sugar:added', priority: 6 });
  m.push({ re: termRegex(PALM_PATTERN, 'gi'), kind: 'fat', ref: 'fat:palm', priority: 7 });
  m.push({ re: termRegex(HYDROGENATED_PATTERN, 'gi'), kind: 'fat', ref: 'fat:hydrogenated', priority: 8 });
  m.push({ re: termRegex(BLEND_PATTERN, 'gi'), kind: 'blend', ref: 'blend:blend', priority: 4 });
  for (const a of ADDITIVES) {
    for (const name of [a.name, ...a.synonyms]) {
      m.push({ re: termRegex(escapeRe(name.toLowerCase()), 'gi'), kind: 'additive', ref: `additive:${a.id}`, concern: a.concern, priority: 3 });
    }
  }
  return m;
}

let cached: Matcher[] | null = null;

/** Splits an ingredient list into plain and highlighted segments (pure; deterministic). */
export function highlightIngredients(text: string): Segment[] {
  if (!text) return [];
  cached ??= buildMatchers();
  const hits: Array<{ start: number; end: number; m: Matcher }> = [];
  for (const m of cached) {
    m.re.lastIndex = 0;
    for (const match of text.matchAll(m.re)) {
      if (match.index === undefined || match[0].length === 0) continue;
      hits.push({ start: match.index, end: match.index + match[0].length, m });
    }
  }
  for (const match of text.matchAll(E_NUMBER_RE)) {
    if (match.index === undefined) continue;
    const entry = lookupENumber(match[1] ?? '', match[2]);
    const ref = `additive:${entry?.id ?? `E${match[1] ?? ''}`}`;
    const matcher: Matcher = { re: E_NUMBER_RE, kind: 'additive', ref, priority: 3 };
    if (entry) matcher.concern = entry.concern;
    hits.push({ start: match.index, end: match.index + match[0].trimEnd().length, m: matcher });
  }
  // Longest match first, then priority; greedily keep non-overlapping hits.
  hits.sort((a, b) => b.end - b.start - (a.end - a.start) || b.m.priority - a.m.priority || a.start - b.start);
  const taken: typeof hits = [];
  for (const h of hits) {
    if (taken.every((t) => h.end <= t.start || h.start >= t.end)) taken.push(h);
  }
  taken.sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const h of taken) {
    if (h.start > cursor) segments.push({ text: text.slice(cursor, h.start) });
    const seg: Segment = { text: text.slice(h.start, h.end), kind: h.m.kind, ref: h.m.ref };
    if (h.m.concern) seg.concern = h.m.concern;
    segments.push(seg);
    cursor = h.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
