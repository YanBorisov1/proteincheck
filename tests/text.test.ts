import { describe, expect, it } from 'vitest';
import { cleanIngredientsText, flattenIngredients, normalize, parseIngredients, piecewise, splitTopLevel } from '../src/analysis/text';

describe('text helpers', () => {
  it('normalises accents and case', () => {
    expect(normalize('  Protéines  DE Lait ')).toBe('proteines de lait');
  });

  it('splits only on top-level commas', () => {
    expect(splitTopLevel('a, b (c, d), e; f')).toEqual(['a', 'b (c, d)', 'e', 'f']);
  });

  it('parses nested ingredients with percentages', () => {
    const list = parseIngredients('Ingredients: Protein blend (whey 40%, casein), sugar, salt.');
    expect(list).toHaveLength(3);
    expect(list[0]?.norm).toBe('protein blend');
    expect(list[0]?.children.map((c) => c.norm)).toEqual(['whey 40%', 'casein']);
    expect(list[0]?.children[0]?.percent).toBe(40);
    expect(list[2]?.norm).toBe('salt');
  });

  it('treats a parenthesised percentage as a percentage, not a child', () => {
    const [first] = parseIngredients('whey protein (85%), cocoa');
    expect(first?.percent).toBe(85);
    expect(first?.children).toHaveLength(0);
  });

  it('removes trace statements', () => {
    expect(cleanIngredientsText('oats, sugar. May contain nuts.')).toBe('oats, sugar.');
  });

  it('flattens with inherited positions and depth', () => {
    const flat = flattenIngredients(parseIngredients('coating (sugar, cocoa), whey'));
    expect(flat.map((f) => [f.norm, f.position, f.depth])).toEqual([
      ['coating', 0, 0],
      ['sugar', 0, 1],
      ['cocoa', 0, 1],
      ['whey', 1, 0],
    ]);
  });

  it('interpolates piecewise curves and clamps at the ends', () => {
    const pts = [[0, 0], [10, 100]] as const;
    expect(piecewise(-5, pts)).toBe(0);
    expect(piecewise(5, pts)).toBe(50);
    expect(piecewise(50, pts)).toBe(100);
  });
});
