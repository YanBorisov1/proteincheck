import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarcodeForm } from '../components/BarcodeForm';
import { Icon } from '../components/Icon';
import { ProductCard } from '../components/ProductCard';
import { Card, linkButton } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { listHistory, type SavedProduct } from '../services/db';
import { searchProducts, type SearchHit } from '../services/openFoodFacts';
import { useOnline } from '../state/online';

export function HomePage() {
  const { t, d } = useI18n();
  const online = useOnline();
  const [history, setHistory] = useState<SavedProduct[]>([]);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    void listHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  const localHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return history.filter((s) => `${s.product.name} ${s.product.brand ?? ''} ${s.product.barcode ?? ''}`.toLowerCase().includes(q));
  }, [history, query]);

  // Debounced online search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !online) {
      setHits(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchProducts(q)
        .then((r) => !cancelled && setHits(r))
        .catch(() => !cancelled && setHits([]))
        .finally(() => !cancelled && setSearching(false));
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, online]);

  return (
    <div className="space-y-6">
      <section className="space-y-3 text-center">
        <p className="text-gray-700 dark:text-gray-300">{t('app.tagline')}</p>
        <Link to="/scan" className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-brand-700 p-6 text-white shadow-lg hover:bg-brand-800">
          <Icon name="scan" className="h-12 w-12" />
          <span className="text-2xl font-bold">{t('home.scan')}</span>
          <span className="text-sm opacity-90">{t('home.scanHint')}</span>
        </Link>
      </section>

      <Card>
        <h2 className="mb-2 font-semibold">{t('home.enterBarcode')}</h2>
        <BarcodeForm id="home-barcode" />
      </Card>

      <section aria-labelledby="search-heading">
        <h2 id="search-heading" className="mb-2 text-lg font-semibold">{t('home.search')}</h2>
        <label htmlFor="search" className="sr-only">{t('home.searchLabel')}</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Icon name="search" className="h-5 w-5" /></span>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('home.searchPlaceholder')}
            className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-base dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        {query.trim().length >= 2 && (
          <div className="mt-3 space-y-4" aria-live="polite">
            {localHits.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">{t('home.searchLocal')}</h3>
                <ul className="space-y-2">{localHits.slice(0, 5).map((s) => <ProductCard key={s.id} product={s.product} />)}</ul>
              </div>
            )}
            {!online && <p className="text-sm text-gray-600 dark:text-gray-400">{t('home.searchOffline')}</p>}
            {online && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">{t('home.searchOnline')}</h3>
                {searching && <p className="text-sm">{t('common.loading')}</p>}
                {hits && hits.length === 0 && !searching && <p className="text-sm">{t('home.searchNone')}</p>}
                <ul className="space-y-2">
                  {hits?.map((h) => (
                    <li key={h.barcode}>
                      <Link to={`/product/${h.barcode}`} className="flex min-h-[56px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
                        {h.imageUrl ? <img src={h.imageUrl} alt="" loading="lazy" className="h-12 w-12 rounded-lg bg-white object-contain" /> : <span className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{h.name}</span>
                          <span className="block truncate text-sm text-gray-600 dark:text-gray-400">{[h.brand, h.barcode].filter(Boolean).join(' · ')}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-heading">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="recent-heading" className="text-lg font-semibold">{t('home.recent')}</h2>
          {history.length > 0 && <Link to="/history" className="min-h-[44px] content-center text-sm font-medium text-brand-700 underline dark:text-brand-100">{t('home.seeAll')}</Link>}
        </div>
        {history.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">{t('home.noRecent')}</p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 5).map((s) => <ProductCard key={s.id} product={s.product} meta={d(s.scannedAt)} />)}
          </ul>
        )}
      </section>

      <Card>
        <h2 className="mb-3 font-semibold">{t('home.noBarcode')}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link to="/add?mode=photo" className={linkButton('secondary')}><Icon name="camera" className="h-5 w-5" />{t('home.photoLabel')}</Link>
          <Link to="/add?mode=manual" className={linkButton('secondary')}><Icon name="edit" className="h-5 w-5" />{t('home.manualEntry')}</Link>
        </div>
      </Card>
    </div>
  );
}
