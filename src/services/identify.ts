import { rankCandidates, searchQueries, type QueryToken, type RankedCandidate } from '../analysis/identify';
import { listHistory } from './db';
import { searchProducts, type SearchHit } from './openFoodFacts';

export interface IdentifyResult {
  matches: Array<RankedCandidate<SearchHit & { local?: boolean }>>;
  /** True when the online search failed (offline or server error); local history was still searched. */
  onlineFailed: boolean;
}

/**
 * Finds products matching words read from a pack: searches the user's own history
 * (works offline) and Open Food Facts, trying narrower queries first.
 */
export async function identifyProduct(tokens: QueryToken[], fetchImpl: typeof fetch = fetch): Promise<IdentifyResult> {
  const pool: Array<SearchHit & { local?: boolean }> = [];
  const history = await listHistory().catch(() => []);
  for (const s of history) {
    const hit: SearchHit & { local?: boolean } = { barcode: s.product.id, name: s.product.name, local: true };
    if (s.product.brand) hit.brand = s.product.brand;
    if (s.product.imageUrl) hit.imageUrl = s.product.imageUrl;
    if (s.product.quantity) hit.quantity = s.product.quantity;
    pool.push(hit);
  }
  let onlineFailed = false;
  let online = 0;
  for (const q of searchQueries(tokens)) {
    try {
      const hits = await searchProducts(q, fetchImpl);
      pool.push(...hits);
      online += hits.length;
    } catch {
      onlineFailed = true;
      break;
    }
    if (online >= 8) break;
  }
  const ranked = rankCandidates(tokens, pool).filter((r) => r.score > 0 || !r.candidate.local);
  return { matches: ranked.slice(0, 12), onlineFailed };
}
