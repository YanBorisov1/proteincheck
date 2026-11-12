import type { Product } from '../src/analysis/types';

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'test',
    name: 'Test product',
    ingredientsText: '',
    nutriments: {},
    allergenTags: [],
    tracesTags: [],
    labels: [],
    categories: [],
    analysisTags: [],
    source: 'manual',
    fetchedAt: 0,
    ...overrides,
  };
}

export const wheyPowder = makeProduct({
  id: 'whey',
  name: '100% Whey Protein Chocolate',
  servingSizeG: 30,
  packageSizeG: 1000,
  ingredientsText:
    'Whey protein concentrate (milk) (85%), fat-reduced cocoa powder, emulsifier: soy lecithin, flavouring, sweetener: sucralose',
  nutriments: {
    energyKcal100g: 380,
    proteins100g: 78,
    carbohydrates100g: 6,
    sugars100g: 4,
    fat100g: 6,
    saturatedFat100g: 3.5,
    fiber100g: 2,
    salt100g: 0.5,
  },
  labels: ['en:high-proteins'],
  categories: ['en:protein-powders'],
});

export const junkBar = makeProduct({
  id: 'junk',
  name: 'Protein Crunch Bar',
  servingSizeG: 50,
  ingredientsText:
    'Milk chocolate coating (sugar, cocoa butter, whole milk powder, cocoa mass, emulsifier: soy lecithin), glucose syrup, protein blend (soy protein isolate, collagen hydrolysate), sugar, palm fat, maltodextrin, humectant: glycerol, glycine, taurine, flavouring, salt, colour: E129',
  nutriments: {
    energyKcal100g: 420,
    proteins100g: 10,
    carbohydrates100g: 60,
    sugars100g: 35,
    fat100g: 15,
    saturatedFat100g: 8,
    fiber100g: 1,
    salt100g: 0.6,
  },
});

export const collagenBar = makeProduct({
  id: 'collagen',
  name: 'Collagen Protein Bar 20g protein',
  ingredientsText:
    'Collagen hydrolysate (bovine), maltitol, soluble corn fiber, almonds, whey protein isolate, cocoa butter, flavouring, sweetener: sucralose',
  nutriments: {
    energyKcal100g: 330,
    proteins100g: 33,
    carbohydrates100g: 35,
    sugars100g: 2,
    polyols100g: 18,
    fat100g: 10,
    saturatedFat100g: 4,
    fiber100g: 15,
    salt100g: 0.3,
  },
});

export const greekYogurt = makeProduct({
  id: 'yogurt',
  name: 'Greek style yogurt 0%',
  servingSizeG: 150,
  ingredientsText: 'Pasteurised skimmed milk, live cultures',
  nutriments: { energyKcal100g: 57, proteins100g: 10, carbohydrates100g: 3.6, sugars100g: 3.6, fat100g: 0.2, saturatedFat100g: 0.1, salt100g: 0.1 },
  novaGroup: 1,
});

export const veganBlend = makeProduct({
  id: 'vegan',
  name: 'Vegan Protein Powder',
  ingredientsText: 'Pea protein isolate (60%), brown rice protein (30%), cocoa powder, natural flavouring, sweetener: steviol glycosides',
  nutriments: { energyKcal100g: 370, proteins100g: 72, carbohydrates100g: 8, sugars100g: 1, fat100g: 6, saturatedFat100g: 1.2, salt100g: 1.8 },
});
