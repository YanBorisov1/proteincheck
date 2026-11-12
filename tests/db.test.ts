import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearHistory,
  exportHistory,
  getSaved,
  importHistory,
  listHistory,
  parseExportFile,
  saveProduct,
  updateSaved,
} from '../src/services/db';
import { junkBar, wheyPowder } from './fixtures';

beforeEach(async () => {
  await clearHistory();
});

describe('local history (IndexedDB)', () => {
  it('saves and lists newest first', async () => {
    await saveProduct(wheyPowder, 1);
    await saveProduct(junkBar, 2);
    expect((await listHistory()).map((s) => s.id)).toEqual(['junk', 'whey']);
  });

  it('keeps favourite and price when a product is re-scanned', async () => {
    await saveProduct(wheyPowder, 1);
    await updateSaved('whey', { favorite: true, price: 30 });
    await saveProduct(wheyPowder, 5);
    expect(await getSaved('whey')).toMatchObject({ favorite: true, price: 30, scannedAt: 5 });
  });

  it('can clear a price', async () => {
    await saveProduct(wheyPowder, 1);
    await updateSaved('whey', { price: 30 });
    await updateSaved('whey', { price: undefined });
    expect((await getSaved('whey'))?.price).toBeUndefined();
  });

  it('round-trips export and import', async () => {
    await saveProduct(wheyPowder, 1);
    await updateSaved('whey', { favorite: true });
    const file = JSON.parse(JSON.stringify(await exportHistory()));
    await clearHistory();
    expect(await importHistory(file)).toBe(1);
    const back = await getSaved('whey');
    expect(back?.favorite).toBe(true);
    expect(back?.product.nutriments.proteins100g).toBe(78);
  });

  it('rejects foreign files and skips malformed items', () => {
    expect(() => parseExportFile({ hello: 1 })).toThrow();
    const items = parseExportFile({ app: 'ProteinCheck', items: [{ id: 'x' }, { id: 'y', product: { name: 'Y', nutriments: { proteins100g: 5, bad: 'no' } } }] });
    expect(items).toHaveLength(1);
    expect(items[0]?.product.nutriments).toEqual({ proteins100g: 5 });
  });
});
