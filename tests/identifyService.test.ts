import { beforeEach, describe, expect, it } from 'vitest';
import { queryFromText } from '../src/analysis/identify';
import { clearHistory, saveProduct } from '../src/services/db';
import { identifyProduct } from '../src/services/identify';
import { makeProduct } from './fixtures';

const searchFetch = (products: unknown[]): typeof fetch =>
  (async () => new Response(JSON.stringify({ products }), { status: 200 })) as typeof fetch;

beforeEach(async () => {
  await clearHistory();
});

describe('identifyProduct', () => {
  it('ranks Open Food Facts results by how well they match the pack', async () => {
    const r = await identifyProduct(
      queryFromText('grenade carb killa caramel'),
      searchFetch([
        { code: '111', product_name: 'Protein bar caramel', brands: 'Other' },
        { code: '222', product_name: 'Carb Killa Caramel Chaos', brands: 'Grenade' },
      ]),
    );
    expect(r.matches[0]?.candidate.barcode).toBe('222');
    expect(r.onlineFailed).toBe(false);
  });

  it('falls back to products in history when offline', async () => {
    await saveProduct(makeProduct({ id: '333', name: 'Impact Whey Chocolate', brand: 'Myprotein' }));
    await saveProduct(makeProduct({ id: '444', name: 'Oat biscuits', brand: 'Bakery' }));
    const offline = (async () => {
      throw new TypeError('offline');
    }) as typeof fetch;
    const r = await identifyProduct(queryFromText('myprotein impact whey'), offline);
    expect(r.onlineFailed).toBe(true);
    expect(r.matches.map((m) => m.candidate.barcode)).toEqual(['333']);
    expect(r.matches[0]?.candidate.local).toBe(true);
  });
});
