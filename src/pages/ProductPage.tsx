import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Button, Card, PageTitle, Spinner, linkButton } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { getSaved, saveProduct, type SavedProduct } from '../services/db';
import { ProductLookupError, contributeUrl, fetchProduct, isValidBarcode } from '../services/openFoodFacts';
import { ResultsView } from './results/ResultsView';

type State =
  | { status: 'loading' }
  | { status: 'ready'; saved: SavedProduct; cached: boolean }
  | { status: 'error'; kind: ProductLookupError['kind'] };

const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

export default function ProductPage() {
  const { id: rawId = '' } = useParams();
  const id = decodeURIComponent(rawId);
  const { t } = useI18n();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const cached = await getSaved(id).catch(() => undefined);
    if (cached) {
      setState({ status: 'ready', saved: await saveProduct(cached.product).catch(() => cached), cached: true });
      // Quietly refresh stale Open Food Facts data when online.
      if (cached.product.source === 'off' && navigator.onLine && Date.now() - cached.product.fetchedAt > REFRESH_AFTER_MS) {
        fetchProduct(id)
          .then((fresh) => saveProduct(fresh))
          .then((saved) => setState({ status: 'ready', saved, cached: false }))
          .catch(() => undefined);
      }
      return;
    }
    if (!isValidBarcode(id)) {
      setState({ status: 'error', kind: 'notFound' });
      return;
    }
    try {
      const product = await fetchProduct(id);
      setState({ status: 'ready', saved: await saveProduct(product), cached: false });
    } catch (e) {
      setState({ status: 'error', kind: e instanceof ProductLookupError ? e.kind : 'network' });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === 'loading') return <Spinner label={t('product.loading')} />;

  if (state.status === 'error') {
    const notFound = state.kind === 'notFound' || state.kind === 'invalid';
    return (
      <div className="space-y-4">
        <PageTitle>{notFound ? t('product.notFoundTitle') : state.kind === 'server' ? t('product.serverTitle') : t('product.networkTitle')}</PageTitle>
        <p>{notFound ? t('product.notFoundBody', { code: id }) : t('product.networkBody')}</p>
        {!notFound && (
          <Button onClick={() => void load()} className="w-full">{t('product.retry')}</Button>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Link to={`/add?mode=photo&barcode=${encodeURIComponent(id)}`} className={linkButton(notFound ? 'primary' : 'secondary')}>
            <Icon name="camera" className="h-5 w-5" /> {t('home.photoLabel')}
          </Link>
          <Link to={`/add?mode=manual&barcode=${encodeURIComponent(id)}`} className={linkButton('secondary')}>
            <Icon name="edit" className="h-5 w-5" /> {t('home.manualEntry')}
          </Link>
        </div>
        {notFound && (
          <Card>
            <p className="mb-3 text-sm">{t('product.contributeHint')}</p>
            <a href={contributeUrl(id)} target="_blank" rel="noopener noreferrer" className={`${linkButton('secondary')} w-full`}>
              {t('product.contribute')} <Icon name="external" className="h-4 w-4" />
            </a>
          </Card>
        )}
      </div>
    );
  }

  return (
    <ResultsView
      saved={state.saved}
      cached={state.cached}
      onChange={(saved) => setState({ status: 'ready', saved, cached: state.cached })}
    />
  );
}
