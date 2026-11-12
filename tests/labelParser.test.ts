import { describe, expect, it } from 'vitest';
import { cleanOcrText, parseIngredientsFromOcr, parseNutritionText } from '../src/analysis/labelParser';

const EU_LABEL = `NUTRITION INFORMATION  Per 100g  Per bar (60g)
Energy 1590kJ / 379kcal 954kJ / 227kcal
Fat 12g 7.2g
of which saturates 6,1g 3.7g
Carbohydrate 31g 18.6g
of which sugars 4.2g 2.5g
of which polyols 18g 10.8g
Fibre 9.5g 5.7g
Protein 33g 19.8g
Salt 0.45g 0.27g`;

describe('nutrition table OCR parsing', () => {
  it('parses an EU-style table using the per-100 g column', () => {
    const r = parseNutritionText(EU_LABEL);
    expect(r.nutriments).toEqual({
      energyKcal100g: 379,
      fat100g: 12,
      saturatedFat100g: 6.1,
      carbohydrates100g: 31,
      sugars100g: 4.2,
      polyols100g: 18,
      fiber100g: 9.5,
      proteins100g: 33,
      salt100g: 0.45,
    });
    expect(r.servingSizeG).toBe(60);
  });

  it('converts kJ when kcal is missing and sodium in mg to salt', () => {
    const r = parseNutritionText('Energy 1674 kJ\nProtein 20 g\nSodium 400mg');
    expect(r.nutriments.energyKcal100g).toBe(400);
    expect(r.nutriments.sodium100g).toBe(0.4);
    expect(r.nutriments.salt100g).toBe(1);
  });

  it('handles German labels', () => {
    const r = parseNutritionText('Brennwert 1500 kJ / 358 kcal\nEiweiß 25 g\ndavon Zucker 3,5 g');
    expect(r.nutriments.proteins100g).toBe(25);
    expect(r.nutriments.sugars100g).toBe(3.5);
  });

  it('fixes common OCR digit confusions', () => {
    expect(cleanOcrText('Protein 2O g')).toBe('Protein 20 g');
    expect(cleanOcrText('Fat 1l.5g')).toBe('Fat 11.5g');
  });
});

describe('ingredient OCR parsing', () => {
  it('extracts the ingredient paragraph and joins wrapped lines', () => {
    const text = 'Best before: see lid\nINGREDIENTS: Milk protein, whey pro-\ntein isolate, cocoa,\nsweetener (sucralose).\nAllergy advice: see ingredients in bold.';
    expect(parseIngredientsFromOcr(text)).toBe('Milk protein, whey protein isolate, cocoa, sweetener (sucralose)');
  });
});
