import { describe, expect, it } from 'vitest';
import { highlightIngredients } from '../src/analysis/highlight';

describe('ingredient highlighting', () => {
  it('reconstructs the original text exactly', () => {
    const text = 'Whey protein isolate (milk), maltodextrin, E322, glycine, sucralose, palm oil.';
    const segs = highlightIngredients(text);
    expect(segs.map((s) => s.text).join('')).toBe(text);
  });

  it('tags each kind of ingredient', () => {
    const segs = highlightIngredients('Whey protein isolate, collagen, maltodextrin, E171, glycine, sucralose, maltitol, sugar, palm oil');
    const tagged = Object.fromEntries(segs.filter((s) => s.kind).map((s) => [s.text, s.kind]));
    expect(tagged).toMatchObject({
      'Whey protein isolate': 'protein',
      collagen: 'proteinIncomplete',
      maltodextrin: 'filler',
      E171: 'additive',
      glycine: 'spiking',
      sucralose: 'sweetener',
      maltitol: 'polyol',
      sugar: 'sugar',
      'palm oil': 'fat',
    });
    expect(segs.find((s) => s.text === 'E171')).toMatchObject({ ref: 'additive:E171', concern: 'high' });
  });

  it('returns an empty array for empty text', () => {
    expect(highlightIngredients('')).toEqual([]);
  });
});
