import { describe, expect, it } from 'vitest';
import {
  buildQuery,
  cleanToken,
  editDistance,
  matchConfidence,
  queryFromText,
  rankCandidates,
  searchQueries,
  tokenMatches,
} from '../src/analysis/identify';

describe('cleanToken', () => {
  it('keeps real words and drops noise, numbers and stop words', () => {
    expect(cleanToken('Grenade®')).toBe('grenade');
    expect(cleanToken('“Carb')).toBe('carb');
    expect(cleanToken('20g')).toBeNull();
    expect(cleanToken('kcal')).toBeNull();
    expect(cleanToken('~~|')).toBeNull();
    expect(cleanToken('the')).toBeNull();
  });
});

describe('buildQuery', () => {
  it('ranks big, confident, distinctive words first', () => {
    const tokens = buildQuery([
      { text: 'GRENADE', confidence: 92, height: 120 },
      { text: 'Carb Killa', confidence: 88, height: 60 },
      { text: 'PROTEIN', confidence: 95, height: 80 },
      { text: 'Chocolate Chip Salted Caramel', confidence: 80, height: 30 },
      { text: 'net wt 60g', confidence: 90, height: 10 },
      { text: 'xqzv', confidence: 20, height: 100 },
    ]);
    expect(tokens.map((t) => t.token).slice(0, 3)).toEqual(['grenade', 'carb', 'killa']);
    expect(tokens.find((t) => t.token === 'xqzv')).toBeUndefined();
    expect(tokens.find((t) => t.token === 'net')).toBeUndefined();
    // Generic pack words are kept but weigh little.
    const protein = tokens.find((t) => t.token === 'protein');
    expect(protein && protein.weight < 30).toBe(true);
  });

  it('returns nothing for unreadable photos', () => {
    expect(buildQuery([{ text: '%%', confidence: 90, height: 50 }])).toEqual([]);
  });
});

describe('queryFromText', () => {
  it('turns typed words into tokens', () => {
    expect(queryFromText('Myprotein Impact whey').map((t) => [t.token, t.weight])).toEqual([
      ['myprotein', 1],
      ['impact', 1],
      ['whey', 0.25],
    ]);
  });
});

describe('searchQueries', () => {
  it('goes from specific to broad and leaves generic words out of narrow queries', () => {
    const q = searchQueries(queryFromText('Grenade Carb Killa protein bar caramel'));
    expect(q[0]).toBe('grenade carb killa');
    expect(q).toContain('grenade');
    expect(new Set(q).size).toBe(q.length);
  });
});

describe('fuzzy matching', () => {
  it('computes small edit distances', () => {
    expect(editDistance('grenade', 'grenade')).toBe(0);
    expect(editDistance('grenade', 'gremade')).toBe(1);
    expect(editDistance('abc', 'xyzxyz')).toBeGreaterThan(2);
  });

  it('tolerates OCR misreads and prefixes but not unrelated words', () => {
    expect(tokenMatches('gremade', 'grenade')).toBe(true);
    expect(tokenMatches('choc', 'chocolate')).toBe(true);
    expect(tokenMatches('bar', 'bars')).toBe(false);
    expect(tokenMatches('whey', 'they')).toBe(false);
  });
});

describe('rankCandidates', () => {
  const candidates = [
    { barcode: '1', name: 'Protein Bar Chocolate', brand: 'Generic' },
    { barcode: '2', name: 'Carb Killa Salted Caramel', brand: 'Grenade' },
    { barcode: '3', name: 'Carb Killa Cookie Dough', brand: 'Grenade' },
    { barcode: '2', name: 'duplicate', brand: 'x' },
  ];

  it('puts the product whose name and brand match best first', () => {
    const tokens = queryFromText('grenade carb killa salted caramel');
    const ranked = rankCandidates(tokens, candidates);
    expect(ranked.map((r) => r.candidate.barcode)).toEqual(['2', '3', '1']);
    expect(ranked[0]?.score).toBe(1);
  });

  it('matches despite an OCR typo', () => {
    const ranked = rankCandidates(queryFromText('gremade carb kila'), candidates);
    expect(ranked[0]?.candidate.brand).toBe('Grenade');
  });

  it('judges confidence from the gap between the best two', () => {
    expect(matchConfidence([1, 0.5])).toBe('strong');
    expect(matchConfidence([0.9, 0.85])).toBe('possible');
    expect(matchConfidence([0.2])).toBe('weak');
    expect(matchConfidence([])).toBe('weak');
  });
});
