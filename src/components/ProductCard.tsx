import { Link } from 'react-router-dom';
import { analyzeProduct } from '../analysis';
import type { Product } from '../analysis/types';
import { useSettings } from '../state/settings';
import { ScoreBadge } from './ScoreBadge';
import { useMemo, type ReactNode } from 'react';

export function ProductThumb({ product }: { product: Product }) {
  return product.imageUrl ? (
    <img src={product.imageUrl} alt="" loading="lazy" decoding="async" className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain" />
  ) : (
    <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800" aria-hidden="true" />
  );
}

export function ProductCard({ product, meta, action }: { product: Product; meta?: string; action?: ReactNode }) {
  const { settings } = useSettings();
  const score = useMemo(() => analyzeProduct(product, { prefs: settings.prefs }).score, [product, settings.prefs]);
  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 pr-3 dark:border-gray-700 dark:bg-gray-900">
      <Link to={`/product/${encodeURIComponent(product.id)}`} className="flex min-h-[48px] flex-1 items-center gap-3 rounded-lg">
        <ProductThumb product={product} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{product.name}</span>
          <span className="block truncate text-sm text-gray-600 dark:text-gray-400">{[product.brand, meta].filter(Boolean).join(' · ')}</span>
        </span>
        <ScoreBadge size="sm" {...(score.total !== undefined ? { score: score.total } : {})} {...(score.grade ? { grade: score.grade } : {})} />
      </Link>
      {action}
    </li>
  );
}
