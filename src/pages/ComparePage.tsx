import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { analyzeProduct, type AnalysisResult } from '../analysis';
import { ScoreBadge } from '../components/ScoreBadge';
import { Button, PageTitle } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { listHistory, type SavedProduct } from '../services/db';
import { MAX_COMPARE, useCompareList } from '../state/compare';
import { useSettings } from '../state/settings';
import { formatMoney } from '../utils/format';

interface Row {
  key: string;
  label: string;
  value: (r: AnalysisResult) => number | undefined;
  render: (r: AnalysisResult, v: number | undefined) => ReactNode;
  better?: 'high' | 'low';
}

export default function ComparePage() {
  const { t, n, locale } = useI18n();
  const { settings } = useSettings();
  const compare = useCompareList();
  const [history, setHistory] = useState<SavedProduct[] | null>(null);

  useEffect(() => {
    void listHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  const selected = useMemo(() => (history ?? []).filter((s) => compare.ids.includes(s.id)), [history, compare.ids]);
  const results = useMemo(
    () =>
      selected.map((s) =>
        analyzeProduct(s.product, {
          prefs: settings.prefs,
          ...(s.price !== undefined ? { price: s.price } : {}),
          ...(s.packageSizeG !== undefined ? { packageSizeG: s.packageSizeG } : {}),
        }),
      ),
    [selected, settings.prefs],
  );

  const g = (v: number | undefined, d = 1) => (v === undefined ? '—' : `${n(v, d)} g`);
  const rows: Row[] = [
    { key: 'score', label: t('compare.row.score'), value: (r) => r.score.total, render: (r) => <ScoreBadge size="sm" {...(r.score.total !== undefined ? { score: r.score.total } : {})} {...(r.score.grade ? { grade: r.score.grade } : {})} />, better: 'high' },
    { key: 'pct', label: t('compare.row.proteinPct'), value: (r) => r.density.energyPct, render: (_, v) => (v === undefined ? '—' : `${v}%`), better: 'high' },
    { key: 'p100', label: t('compare.row.protein100'), value: (r) => r.density.per100g, render: (_, v) => g(v), better: 'high' },
    { key: 'pserv', label: t('compare.row.proteinServing'), value: (r) => r.density.perServing, render: (_, v) => g(v) },
    { key: 'sugar', label: t('compare.row.sugar100'), value: (r) => r.sugars.sugars100g, render: (_, v) => g(v), better: 'low' },
    { key: 'ratio', label: t('compare.row.ratio'), value: (r) => r.sugars.sugarToProtein, render: (_, v) => g(v, 2), better: 'low' },
    { key: 'sat', label: t('compare.row.satFat'), value: (r) => r.fats.saturatedFat100g, render: (_, v) => g(v), better: 'low' },
    { key: 'salt', label: t('compare.row.salt'), value: (r) => r.salt.salt100g, render: (_, v) => g(v, 2), better: 'low' },
    { key: 'main', label: t('compare.row.mainSource'), value: () => undefined, render: (r) => (r.quality.main ? t(`source.${r.quality.main.source.id}`) : '—') },
    { key: 'pdcaas', label: t('compare.row.pdcaas'), value: (r) => r.quality.estimatedPdcaas, render: (_, v) => (v === undefined ? '—' : n(v, 2)), better: 'high' },
    { key: 'spike', label: t('compare.row.spiking'), value: (r) => r.spiking.agents.length, render: (r) => (r.spiking.agents.length ? r.spiking.agents.map((a) => a.agent.name).join(', ') : t('common.no')), better: 'low' },
    { key: 'add', label: t('compare.row.additives'), value: (r) => r.additives.additives.length, render: (_, v) => v ?? '—', better: 'low' },
    { key: 'nova', label: t('compare.row.nova'), value: (r) => r.processing.nova, render: (_, v) => v ?? '—', better: 'low' },
    {
      key: 'cost',
      label: t('compare.row.cost30'),
      value: (r) => r.value.costPer30gProtein,
      render: (r, v) => (v === undefined ? <Link className="text-sm text-brand-700 underline dark:text-brand-100" to={`/product/${encodeURIComponent(r.product.id)}`}>{t('compare.addPrice')}</Link> : formatMoney(v, settings.currency, locale)),
      better: 'low',
    },
  ];

  const best = (row: Row): number | undefined => {
    if (!row.better || results.length < 2) return undefined;
    const vals = results.map(row.value).filter((v): v is number => v !== undefined);
    if (vals.length < 2) return undefined;
    return row.better === 'high' ? Math.max(...vals) : Math.min(...vals);
  };

  return (
    <div className="space-y-4">
      <PageTitle>{t('compare.title')}</PageTitle>
      {history !== null && history.length < 2 && <p>{t('compare.needMore')}</p>}

      {results.length >= 2 && (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[480px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">{t('compare.title')}</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 bg-gray-50 p-2 text-left dark:bg-gray-950">{t('compare.metric')}</th>
                {results.map((r) => (
                  <th key={r.product.id} scope="col" className="p-2 text-left align-bottom">
                    <Link to={`/product/${encodeURIComponent(r.product.id)}`} className="line-clamp-3 font-semibold underline">{r.product.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const b = best(row);
                return (
                  <tr key={row.key}>
                    <th scope="row" className="sticky left-0 border-t border-gray-200 bg-gray-50 p-2 text-left font-medium dark:border-gray-800 dark:bg-gray-950">{row.label}</th>
                    {results.map((r) => {
                      const v = row.value(r);
                      const isBest = b !== undefined && v === b;
                      return (
                        <td key={r.product.id} className={`border-t border-gray-200 p-2 tabular-nums dark:border-gray-800 ${isBest ? 'bg-green-50 font-bold text-green-900 dark:bg-green-950 dark:text-green-200' : ''}`}>
                          {row.render(r, v)}
                          {isBest && <span className="sr-only"> ({t('compare.best')})</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {history && history.length >= 2 && (
        <section aria-labelledby="pick-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="pick-heading" className="font-semibold">{t('compare.pick')}</h2>
            {compare.ids.length > 0 && <Button variant="secondary" onClick={compare.clear}>{t('compare.clear')}</Button>}
          </div>
          {compare.ids.length >= MAX_COMPARE && <p className="mb-2 text-sm">{t('compare.tooMany')}</p>}
          <ul className="space-y-2">
            {history.map((s) => {
              const checked = compare.ids.includes(s.id);
              return (
                <li key={s.id}>
                  <label className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && compare.ids.length >= MAX_COMPARE}
                      onChange={() => compare.toggle(s.id)}
                      className="h-6 w-6 accent-brand-700"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.product.name}</span>
                      {s.product.brand && <span className="block truncate text-sm text-gray-600 dark:text-gray-400">{s.product.brand}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
