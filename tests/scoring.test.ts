import { describe, expect, it } from 'vitest';
import { analyzeProduct, rankFindings } from '../src/analysis';
import { GRADE_THRESHOLDS, SCORE_WEIGHTS } from '../src/analysis/config';
import { gradeFor } from '../src/analysis/scoring';
import { collagenBar, greekYogurt, junkBar, makeProduct, veganBlend, wheyPowder } from './fixtures';

describe('score configuration', () => {
  it('has weights that sum to 1', () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
  it('maps scores to grades at the thresholds', () => {
    for (const [grade, min] of GRADE_THRESHOLDS) expect(gradeFor(min)).toBe(grade);
    expect(gradeFor(79.9)).toBe('B');
    expect(gradeFor(0)).toBe('E');
  });
});

describe('analyzeProduct end-to-end', () => {
  it('rates a clean whey powder highly', () => {
    const r = analyzeProduct(wheyPowder);
    expect(r.score.grade).toMatch(/[AB]/);
    expect(r.score.total).toBeGreaterThanOrEqual(70);
    expect(r.score.confidence).toBe('high');
    expect(r.claim.status).toBe('meets');
    expect(r.goodPoints.length).toBeGreaterThan(0);
  });

  it('exposes a junk "protein" bar', () => {
    const r = analyzeProduct(junkBar);
    expect(r.score.grade).toBe('E');
    expect(r.claim.status).toBe('fails');
    expect(r.spiking.agents.length).toBe(2);
    expect(r.fats.palm).toBe(true);
    const flagCodes = r.redFlags.map((f) => f.code);
    expect(flagCodes).toHaveLength(3);
    expect(flagCodes).toContain('claim.impliedFails');
    expect(flagCodes).toContain('sugar.moreSugarThanProtein');
  });

  it('warns about collagen-based bars and maltitol', () => {
    const r = analyzeProduct(collagenBar);
    expect(r.quality.main?.source.id).toBe('collagen');
    expect(r.redFlags.map((f) => f.code)).toContain('quality.mainIncompleteCollagen');
    expect(r.sugars.sugarAlcohols.map((s) => s.id)).toContain('maltitol');
    expect(r.fillers.findings.map((f) => f.code)).toContain('fiber.netCarbTrick');
    // Quality-adjusted density keeps collagen bars from scoring as protein-dense.
    const density = r.score.subScores.find((s) => s.key === 'proteinDensity');
    expect(density?.reasons.map((x) => x.code)).toContain('score.density.qualityAdjusted');
    expect(r.score.grade).not.toMatch(/[AB]/);
  });

  it('does not take milk powder in a coating as the main protein', () => {
    const r = analyzeProduct(junkBar);
    expect(r.quality.main?.source.id).toBe('soy');
    expect(r.quality.findings.map((f) => f.code)).toContain('quality.containsCollagen');
  });

  it('does not adjust density for decent plant proteins', () => {
    const r = analyzeProduct(veganBlend);
    const density = r.score.subScores.find((s) => s.key === 'proteinDensity');
    expect(density?.reasons.map((x) => x.code)).not.toContain('score.density.qualityAdjusted');
  });

  it('scores plain Greek yogurt well despite modest density claims', () => {
    const r = analyzeProduct(greekYogurt);
    expect(r.processing.nova).toBe(1);
    expect(r.score.total).toBeGreaterThanOrEqual(80);
    expect(r.allergens.vegetarian).toBe('yes');
  });

  it('handles a vegan blend with complementary proteins', () => {
    const r = analyzeProduct(veganBlend);
    expect(r.quality.complementary).toBe(true);
    expect(r.allergens.vegan).toBe('yes');
  });

  it('applies value options', () => {
    const r = analyzeProduct(wheyPowder, { price: 30 });
    expect(r.value.costPer30gProtein).toBe(1.15);
  });

  it('withholds the overall score without nutrition data', () => {
    const r = analyzeProduct(makeProduct({ ingredientsText: 'whey protein' }));
    expect(r.score.total).toBeUndefined();
    expect(r.score.confidence).toBe('low');
    expect(r.score.subScores.find((s) => s.key === 'proteinQuality')?.score).toBe(100);
  });

  it('renormalises weights over available sub-scores', () => {
    const r = analyzeProduct(makeProduct({ nutriments: { energyKcal100g: 400, proteins100g: 40 } }));
    expect(r.score.coverage).toBeCloseTo(0.4, 5); // density + claim
    expect(r.score.total).toBeDefined();
  });

  it('every sub-score explains itself', () => {
    const r = analyzeProduct(junkBar);
    for (const s of r.score.subScores) expect(s.reasons.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    expect(analyzeProduct(junkBar)).toEqual(analyzeProduct(junkBar));
  });
});

describe('rankFindings', () => {
  it('ranks bad above warn at equal weight and caps the list', () => {
    const ranked = rankFindings(
      [
        { code: 'a', severity: 'warn', weight: 7 },
        { code: 'b', severity: 'bad', weight: 7 },
        { code: 'c', severity: 'good', weight: 9 },
        { code: 'd', severity: 'warn', weight: 2 },
        { code: 'e', severity: 'bad', weight: 1 },
      ],
      'bad',
    );
    expect(ranked.map((f) => f.code)).toEqual(['b', 'a', 'e']);
  });
});
