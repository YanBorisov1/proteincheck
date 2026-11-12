import { describe, expect, it } from 'vitest';
import { analyzeProteinQuality, detectAminoSpiking, detectProteinSources, estimatePdcaas } from '../src/analysis/quality';
import { flattenIngredients, parseIngredients } from '../src/analysis/text';

const flat = (s: string) => flattenIngredients(parseIngredients(s));

describe('protein source detection', () => {
  it('finds sources in ingredient order', () => {
    const ids = detectProteinSources(flat('Whey protein isolate, milk protein concentrate, pea protein, cocoa')).map((s) => s.source.id);
    expect(ids).toEqual(['whey', 'milk', 'pea']);
  });

  it('does not treat lecithin, milk chocolate or gluten-free as protein', () => {
    expect(detectProteinSources(flat('soy lecithin, milk chocolate, gluten-free oats, coconut milk'))).toEqual([]);
  });

  it('finds sources nested in blends', () => {
    const ids = detectProteinSources(flat('protein blend (calcium caseinate, egg white powder), sugar')).map((s) => s.source.id);
    expect(ids).toEqual(['casein', 'egg']);
  });

  it('weights by declared percentages when all are given', () => {
    const s = detectProteinSources(flat('pea protein (50%), whey protein (50%)'));
    expect(estimatePdcaas(s)).toBeCloseTo((0.845 + 1) / 2, 2);
  });
});

describe('protein quality', () => {
  it('warns when collagen is the main source', () => {
    const q = analyzeProteinQuality(flat('Collagen peptides, cocoa, whey protein'));
    expect(q.main?.source.id).toBe('collagen');
    expect(q.findings[0]?.code).toBe('quality.mainIncompleteCollagen');
    expect(q.estimatedPdcaas).toBeLessThan(0.5);
  });

  it('praises complete main sources', () => {
    const q = analyzeProteinQuality(flat('Whey protein concentrate, cocoa'));
    expect(q.findings.map((f) => f.code)).toContain('quality.mainComplete');
    expect(q.estimatedPdcaas).toBe(1);
  });

  it('recognises complementary plant blends', () => {
    const q = analyzeProteinQuality(flat('Pea protein, rice protein, cocoa'));
    expect(q.complementary).toBe(true);
    expect(q.estimatedPdcaas).toBe(0.9);
    expect(q.findings.map((f) => f.code)).not.toContain('quality.mainIncomplete');
  });

  it('warns on an incomplete single plant source', () => {
    const q = analyzeProteinQuality(flat('Rice protein, cocoa'));
    expect(q.findings[0]).toMatchObject({ code: 'quality.mainIncomplete', params: { limiting: 'lysine' } });
  });

  it('reports when no source can be identified', () => {
    expect(analyzeProteinQuality(flat('sugar, cocoa')).findings[0]?.code).toBe('quality.noSource');
  });
});

describe('amino spiking', () => {
  it('detects free amino acids and nitrogen sources', () => {
    const r = detectAminoSpiking(flat('whey protein, glycine, taurine, L-glutamine, creatine monohydrate'), true);
    expect(r.agents.map((a) => a.agent.id)).toEqual(['glycine', 'taurine', 'glutamine', 'creatine']);
    expect(r.findings[0]).toMatchObject({ code: 'spiking.detected', severity: 'bad' });
  });

  it('ignores chelated minerals like magnesium bisglycinate', () => {
    const r = detectAminoSpiking(flat('whey protein, magnesium bisglycinate'), true);
    expect(r.agents).toEqual([]);
    expect(r.findings[0]?.code).toBe('spiking.none');
  });

  it('treats a single real amino acid as a warning', () => {
    const r = detectAminoSpiking(flat('whey protein, L-leucine'), true);
    expect(r.findings[0]?.severity).toBe('warn');
  });
});
