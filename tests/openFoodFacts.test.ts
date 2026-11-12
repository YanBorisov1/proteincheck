import { describe, expect, it } from 'vitest';
import {
  ProductLookupError,
  contributeUrl,
  fetchProduct,
  isValidBarcode,
  mapOffProduct,
  parseGrams,
  searchProducts,
} from '../src/services/openFoodFacts';

const fakeFetch = (status: number, body: unknown): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

describe('Open Food Facts mapping', () => {
  it('maps a full product', () => {
    const p = mapOffProduct(
      {
        code: '5000000000001',
        product_name: 'Choc Protein Bar',
        brands: 'BrandA, BrandB',
        quantity: '12 x 60 g',
        serving_quantity: '60',
        ingredients_text: 'whey protein, sugar',
        nutriments: { 'energy-kcal_100g': 380, proteins_100g: '33', 'saturated-fat_100g': 6, salt_100g: 0.4 },
        nova_group: 4,
        allergens_tags: ['en:milk'],
        labels_tags: ['en:high-proteins'],
      },
      '5000000000001',
      123,
    );
    expect(p).toMatchObject({
      id: '5000000000001',
      name: 'Choc Protein Bar',
      brand: 'BrandA',
      servingSizeG: 60,
      novaGroup: 4,
      source: 'off',
      fetchedAt: 123,
      nutriments: { energyKcal100g: 380, proteins100g: 33, saturatedFat100g: 6, salt100g: 0.4 },
    });
    expect(p.allergenTags).toEqual(['en:milk']);
  });

  it('survives a product with almost nothing filled in', () => {
    const p = mapOffProduct({ nutriments: { energy_100g: 1674, proteins_100g: 'n/a' } }, '123456789');
    expect(p.name).toBe('Product 123456789');
    expect(p.ingredientsText).toBe('');
    expect(p.nutriments).toEqual({ energyKcal100g: 400 });
    expect(p.novaGroup).toBeUndefined();
    expect(p.tracesTags).toEqual([]);
  });

  it('parses gram quantities', () => {
    expect(parseGrams('1 bar (45g)')).toBe(45);
    expect(parseGrams('2,5 kg')).toBe(2500);
    expect(parseGrams('one scoop')).toBeUndefined();
  });

  it('validates barcodes', () => {
    expect(isValidBarcode('4006381333931')).toBe(true);
    expect(isValidBarcode('abc')).toBe(false);
    expect(isValidBarcode('12')).toBe(false);
  });

  it('builds contribution links', () => {
    expect(contributeUrl('4006381333931')).toContain('code=4006381333931');
    expect(contributeUrl()).toMatch(/contribute$/);
  });
});

describe('fetchProduct', () => {
  it('returns a mapped product', async () => {
    const p = await fetchProduct('4006381333931', fakeFetch(200, { status: 1, product: { product_name: 'X' } }));
    expect(p.name).toBe('X');
    expect(p.barcode).toBe('4006381333931');
  });

  it('reports not-found products (status 0 and HTTP 404)', async () => {
    await expect(fetchProduct('4006381333931', fakeFetch(200, { status: 0 }))).rejects.toMatchObject({ kind: 'notFound' });
    await expect(fetchProduct('4006381333931', fakeFetch(404, {}))).rejects.toMatchObject({ kind: 'notFound' });
  });

  it('reports network and server errors', async () => {
    const failing = (async () => {
      throw new TypeError('offline');
    }) as typeof fetch;
    await expect(fetchProduct('4006381333931', failing)).rejects.toMatchObject({ kind: 'network' });
    await expect(fetchProduct('4006381333931', fakeFetch(503, {}))).rejects.toMatchObject({ kind: 'server' });
  });

  it('rejects invalid barcodes without a request', async () => {
    await expect(fetchProduct('hello')).rejects.toBeInstanceOf(ProductLookupError);
  });
});

describe('searchProducts', () => {
  it('maps hits and drops entries without a code', async () => {
    const hits = await searchProducts('whey', fakeFetch(200, { products: [{ code: '1234567', product_name: 'Whey' }, { product_name: 'no code' }] }));
    expect(hits).toEqual([{ barcode: '1234567', name: 'Whey' }]);
  });
  it('skips very short queries', async () => {
    expect(await searchProducts('a')).toEqual([]);
  });
});
