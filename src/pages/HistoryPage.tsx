import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { ProductCard } from '../components/ProductCard';
import { Button, PageTitle } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { clearHistory, deleteSaved, exportHistory, importHistory, listHistory, updateSaved, type SavedProduct } from '../services/db';
import { downloadJson } from '../utils/download';

export default function HistoryPage() {
  const { t, d } = useI18n();
  const [items, setItems] = useState<SavedProduct[]>([]);
  const [tab, setTab] = useState<'all' | 'fav'>('all');
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => void listHistory().then(setItems).catch(() => setItems([])), []);
  useEffect(refresh, [refresh]);

  const shown = tab === 'fav' ? items.filter((i) => i.favorite) : items;

  const onExport = async () => {
    const data = await exportHistory();
    downloadJson(`proteincheck-${new Date().toISOString().slice(0, 10)}.json`, data);
  };

  const onImport = async (file: File) => {
    try {
      const count = await importHistory(JSON.parse(await file.text()) as unknown);
      setMessage(t('history.imported', { count }));
      refresh();
    } catch {
      setMessage(t('history.importError'));
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle>{t('history.title')}</PageTitle>
      <div role="tablist" className="flex gap-1 rounded-xl bg-gray-200 p-1 dark:bg-gray-800">
        {(['all', 'fav'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`min-h-[48px] flex-1 rounded-lg font-semibold ${tab === k ? 'bg-white shadow dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
          >
            {k === 'all' ? t('history.all') : t('history.favorites')} ({k === 'all' ? items.length : items.filter((i) => i.favorite).length})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">{tab === 'fav' ? t('history.noFavorites') : t('history.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((s) => (
            <ProductCard
              key={s.id}
              product={s.product}
              meta={t('history.scanned', { date: d(s.scannedAt) })}
              action={
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => void updateSaved(s.id, { favorite: !s.favorite }).then(refresh)}
                    aria-pressed={s.favorite}
                    aria-label={`${s.favorite ? t('results.unfavorite') : t('results.favorite')}: ${s.product.name}`}
                    className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Icon name="star" className={`h-6 w-6 ${s.favorite ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteSaved(s.id).then(refresh)}
                    aria-label={`${t('common.delete')}: ${s.product.name}`}
                    className="flex h-12 w-12 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Icon name="trash" className="h-5 w-5" />
                  </button>
                </div>
              }
            />
          ))}
        </ul>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-400">{t('history.storedLocally')}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant="secondary" onClick={() => void onExport()} disabled={items.length === 0}><Icon name="download" className="h-5 w-5" />{t('history.export')}</Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}><Icon name="upload" className="h-5 w-5" />{t('history.import')}</Button>
        <Button
          variant="danger"
          disabled={items.length === 0}
          onClick={() => {
            if (window.confirm(t('history.confirmClear'))) void clearHistory().then(refresh);
          }}
        >
          <Icon name="trash" className="h-5 w-5" />{t('history.clear')}
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label={t('history.import')}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImport(f);
          e.target.value = '';
        }}
      />
      {message && <p role="status" className="font-medium">{message}</p>}
    </div>
  );
}
