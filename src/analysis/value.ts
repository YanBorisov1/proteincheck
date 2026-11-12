import { round } from './text';

export interface ValueAnalysis {
  price?: number;
  packageSizeG?: number;
  /** Grams of protein in the whole package. */
  proteinPerPackG?: number;
  costPer30gProtein?: number;
  costPer100g?: number;
}

/** Cost of 30 g of protein: price ÷ (package grams × protein fraction) × 30. */
export function costPer30gProtein(price: number, packageSizeG: number, protein100g: number): number | undefined {
  if (!(price > 0) || !(packageSizeG > 0) || !(protein100g > 0)) return undefined;
  const proteinG = (packageSizeG * protein100g) / 100;
  return round((price / proteinG) * 30, 2);
}

export function analyzeValue(price: number | undefined, packageSizeG: number | undefined, protein100g: number | undefined): ValueAnalysis {
  const result: ValueAnalysis = {};
  if (price !== undefined) result.price = price;
  if (packageSizeG !== undefined) result.packageSizeG = packageSizeG;
  if (packageSizeG !== undefined && protein100g !== undefined) {
    result.proteinPerPackG = round((packageSizeG * protein100g) / 100, 1);
  }
  if (price !== undefined && packageSizeG !== undefined && packageSizeG > 0) {
    result.costPer100g = round((price / packageSizeG) * 100, 2);
    if (protein100g !== undefined) {
      const c = costPer30gProtein(price, packageSizeG, protein100g);
      if (c !== undefined) result.costPer30gProtein = c;
    }
  }
  return result;
}
