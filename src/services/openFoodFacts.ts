import type { NovaGroup, Nutriments, Product } from '../analysis/types';

const API = 'https://world.openfoodfacts.org';
const FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'image_front_small_url',
  'image_front_url',
  'quantity',
  'product_quantity',
  'serving_quantity',
  'serving_size',
  'ingredients_text',
  'ingredients_text_en',
  'nutriments',
  'nova_group',
  'allergens_tags',
  'traces_tags',
  'labels_tags',
  'categories_tags',
  'ingredients_analysis_tags',
].join(',');

/** Shape of the subset of the Open Food Facts product we use. Every field may be missing. */
export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  image_front_small_url?: string;
  image_front_url?: string;
  quantity?: string;
  product_quantity?: number | string;
  serving_quantity?: number | string;
  serving_size?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  nutriments?: Record<string, number | string | undefined>;
  nova_group?: number | string;
  allergens_tags?: string[];
  traces_tags?: string[];
  labels_tags?: string[];
  categories_tags?: string[];
  ingredients_analysis_tags?: string[];
}

export interface OffResponse {
  status?: number;
  status_verbose?: string;
  product?: OffProduct;
}

export class ProductLookupError extends Error {
  constructor(
    public readonly kind: 'notFound' | 'network' | 'invalid' | 'server',
    message: string,
  ) {
    super(message);
    this.name = 'ProductLookupError';
  }
}

export function isValidBarcode(code: string): boolean {
  return /^\d{6,14}$/.test(code.trim());
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Turns "60 g" / "1 bar (45g)" / "2 scoops (30 g)" into grams. */
export function parseGrams(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/i);
  if (!m?.[1] || !m[2]) return undefined;
  const value = Number(m[1].replace(',', '.'));
  const unit = m[2].toLowerCase();
  return unit === 'kg' || unit === 'l' ? value * 1000 : value;
}

export function mapNutriments(raw: Record<string, number | string | undefined> | undefined): Nutriments {
  const r = raw ?? {};
  const n: Nutriments = {};
  const set = (key: keyof Nutriments, value: number | undefined) => {
    if (value !== undefined) n[key] = value;
  };
  let kcal = num(r['energy-kcal_100g']);
  if (kcal === undefined) {
    const kj = num(r['energy-kj_100g']) ?? num(r['energy_100g']);
    if (kj !== undefined) kcal = Math.round(kj / 4.184);
  }
  set('energyKcal100g', kcal);
  set('proteins100g', num(r['proteins_100g']));
  set('carbohydrates100g', num(r['carbohydrates_100g']));
  set('sugars100g', num(r['sugars_100g']));
  set('addedSugars100g', num(r['added-sugars_100g']));
  set('polyols100g', num(r['polyols_100g']));
  set('fat100g', num(r['fat_100g']));
  set('saturatedFat100g', num(r['saturated-fat_100g']));
  set('transFat100g', num(r['trans-fat_100g']));
  set('fiber100g', num(r['fiber_100g']));
  set('salt100g', num(r['salt_100g']));
  set('sodium100g', num(r['sodium_100g']));
  return n;
}

export function mapOffProduct(off: OffProduct, barcode: string, now = Date.now()): Product {
  const nova = num(off.nova_group);
  const product: Product = {
    id: off.code ?? barcode,
    barcode: off.code ?? barcode,
    name: (off.product_name || off.product_name_en || off.generic_name || '').trim() || `Product ${barcode}`,
    ingredientsText: (off.ingredients_text_en || off.ingredients_text || '').trim(),
    nutriments: mapNutriments(off.nutriments),
    allergenTags: strArray(off.allergens_tags),
    tracesTags: strArray(off.traces_tags),
    labels: strArray(off.labels_tags),
    categories: strArray(off.categories_tags),
    analysisTags: strArray(off.ingredients_analysis_tags),
    source: 'off',
    fetchedAt: now,
  };
  const brand = off.brands?.split(',')[0]?.trim();
  if (brand) product.brand = brand;
  const image = off.image_front_small_url || off.image_front_url;
  if (image) product.imageUrl = image;
  if (off.quantity) product.quantity = off.quantity;
  const pkg = num(off.product_quantity) ?? parseGrams(off.quantity);
  if (pkg !== undefined && pkg > 0) product.packageSizeG = pkg;
  const serving = num(off.serving_quantity) ?? parseGrams(off.serving_size);
  if (serving !== undefined && serving > 0) product.servingSizeG = serving;
  if (nova !== undefined && nova >= 1 && nova <= 4) product.novaGroup = Math.round(nova) as NovaGroup;
  return product;
}

/** Fetches a product by barcode. Throws ProductLookupError. */
export async function fetchProduct(barcode: string, fetchImpl: typeof fetch = fetch): Promise<Product> {
  const code = barcode.trim();
  if (!isValidBarcode(code)) throw new ProductLookupError('invalid', 'Invalid barcode');
  let res: Response;
  try {
    res = await fetchImpl(`${API}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  } catch {
    throw new ProductLookupError('network', 'Network error');
  }
  if (res.status === 404) throw new ProductLookupError('notFound', 'Product not found');
  if (!res.ok) throw new ProductLookupError('server', `HTTP ${res.status}`);
  let data: OffResponse;
  try {
    data = (await res.json()) as OffResponse;
  } catch {
    throw new ProductLookupError('server', 'Invalid response');
  }
  if (data.status !== 1 || !data.product) throw new ProductLookupError('notFound', 'Product not found');
  return mapOffProduct(data.product, code);
}

export interface SearchHit {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
}

/** Full-text product search (online only). */
export async function searchProducts(query: string, fetchImpl: typeof fetch = fetch): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${API}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,brands,image_front_small_url`;
  let res: Response;
  try {
    res = await fetchImpl(url);
  } catch {
    throw new ProductLookupError('network', 'Network error');
  }
  if (!res.ok) throw new ProductLookupError('server', `HTTP ${res.status}`);
  const data = (await res.json()) as { products?: OffProduct[] };
  return (data.products ?? [])
    .filter((p): p is OffProduct & { code: string } => typeof p.code === 'string' && p.code.length > 0)
    .map((p) => {
      const hit: SearchHit = { barcode: p.code, name: p.product_name?.trim() || p.code };
      const brand = p.brands?.split(',')[0]?.trim();
      if (brand) hit.brand = brand;
      if (p.image_front_small_url) hit.imageUrl = p.image_front_small_url;
      return hit;
    });
}

/** Link to Open Food Facts' own add/edit flow so users can contribute missing products. */
export function contributeUrl(barcode?: string): string {
  return barcode && isValidBarcode(barcode)
    ? `${API}/cgi/product.pl?type=add&code=${encodeURIComponent(barcode)}`
    : `${API}/contribute`;
}

export function productPageUrl(barcode: string): string {
  return `${API}/product/${encodeURIComponent(barcode)}`;
}
