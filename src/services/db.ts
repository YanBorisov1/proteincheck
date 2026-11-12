import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Product } from '../analysis/types';

export interface SavedProduct {
  id: string;
  product: Product;
  scannedAt: number;
  favorite: boolean;
  /** Price paid for the package, for value comparisons. */
  price?: number;
  packageSizeG?: number;
}

interface ProteinCheckDB extends DBSchema {
  products: {
    key: string;
    value: SavedProduct;
    indexes: { byScannedAt: number };
  };
}

const DB_NAME = 'proteincheck';
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<ProteinCheckDB>> | null = null;

function db(): Promise<IDBPDatabase<ProteinCheckDB>> {
  dbPromise ??= openDB<ProteinCheckDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const store = database.createObjectStore('products', { keyPath: 'id' });
      store.createIndex('byScannedAt', 'scannedAt');
    },
  });
  return dbPromise;
}

/** For tests: forget the cached connection. */
export function resetDbConnection(): void {
  dbPromise = null;
}

export async function getSaved(id: string): Promise<SavedProduct | undefined> {
  return (await db()).get('products', id);
}

/** Saves (or refreshes) a product, keeping favourite/price from an earlier save. */
export async function saveProduct(product: Product, now = Date.now()): Promise<SavedProduct> {
  const database = await db();
  const existing = await database.get('products', product.id);
  const record: SavedProduct = { ...existing, id: product.id, product, scannedAt: now, favorite: existing?.favorite ?? false };
  await database.put('products', record);
  return record;
}

export async function updateSaved(id: string, patch: Partial<Omit<SavedProduct, 'id' | 'product'>>): Promise<SavedProduct | undefined> {
  const database = await db();
  const existing = await database.get('products', id);
  if (!existing) return undefined;
  const next: SavedProduct = { ...existing, ...patch };
  for (const key of ['price', 'packageSizeG'] as const) {
    if (key in patch && patch[key] === undefined) delete next[key];
  }
  await database.put('products', next);
  return next;
}

export async function listHistory(): Promise<SavedProduct[]> {
  const all = await (await db()).getAllFromIndex('products', 'byScannedAt');
  return all.reverse();
}

export async function deleteSaved(id: string): Promise<void> {
  await (await db()).delete('products', id);
}

export async function clearHistory(): Promise<void> {
  await (await db()).clear('products');
}

// ---------------------------------------------------------------- export / import

export interface ExportFile {
  app: 'ProteinCheck';
  version: 1;
  exportedAt: string;
  items: SavedProduct[];
}

export async function exportHistory(now = new Date()): Promise<ExportFile> {
  return { app: 'ProteinCheck', version: 1, exportedAt: now.toISOString(), items: await listHistory() };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validates an export file's structure without trusting its contents. */
export function parseExportFile(json: unknown): SavedProduct[] {
  if (!isRecord(json) || json.app !== 'ProteinCheck' || !Array.isArray(json.items)) {
    throw new Error('Not a ProteinCheck export file');
  }
  const items: SavedProduct[] = [];
  for (const raw of json.items) {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !isRecord(raw.product)) continue;
    const p = raw.product;
    if (typeof p.name !== 'string' || !isRecord(p.nutriments)) continue;
    const product: Product = {
      id: raw.id,
      name: p.name,
      ingredientsText: typeof p.ingredientsText === 'string' ? p.ingredientsText : '',
      nutriments: Object.fromEntries(
        Object.entries(p.nutriments).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1])),
      ),
      allergenTags: Array.isArray(p.allergenTags) ? p.allergenTags.filter((x): x is string => typeof x === 'string') : [],
      tracesTags: Array.isArray(p.tracesTags) ? p.tracesTags.filter((x): x is string => typeof x === 'string') : [],
      labels: Array.isArray(p.labels) ? p.labels.filter((x): x is string => typeof x === 'string') : [],
      categories: Array.isArray(p.categories) ? p.categories.filter((x): x is string => typeof x === 'string') : [],
      analysisTags: Array.isArray(p.analysisTags) ? p.analysisTags.filter((x): x is string => typeof x === 'string') : [],
      source: p.source === 'off' || p.source === 'ocr' ? p.source : 'manual',
      fetchedAt: typeof p.fetchedAt === 'number' ? p.fetchedAt : 0,
    };
    for (const key of ['barcode', 'brand', 'imageUrl', 'quantity'] as const) {
      const v = p[key];
      if (typeof v === 'string') product[key] = v;
    }
    for (const key of ['packageSizeG', 'servingSizeG'] as const) {
      const v = p[key];
      if (typeof v === 'number' && v > 0) product[key] = v;
    }
    if (typeof p.novaGroup === 'number' && [1, 2, 3, 4].includes(p.novaGroup)) product.novaGroup = p.novaGroup as 1 | 2 | 3 | 4;
    const item: SavedProduct = {
      id: raw.id,
      product,
      scannedAt: typeof raw.scannedAt === 'number' ? raw.scannedAt : Date.now(),
      favorite: raw.favorite === true,
    };
    if (typeof raw.price === 'number' && raw.price > 0) item.price = raw.price;
    if (typeof raw.packageSizeG === 'number' && raw.packageSizeG > 0) item.packageSizeG = raw.packageSizeG;
    items.push(item);
  }
  return items;
}

/** Imports records; newer scans win on conflicts. Returns the number imported. */
export async function importHistory(json: unknown): Promise<number> {
  const items = parseExportFile(json);
  const database = await db();
  const tx = database.transaction('products', 'readwrite');
  for (const item of items) {
    const existing = await tx.store.get(item.id);
    if (!existing || existing.scannedAt <= item.scannedAt) await tx.store.put(item);
  }
  await tx.done;
  return items.length;
}
