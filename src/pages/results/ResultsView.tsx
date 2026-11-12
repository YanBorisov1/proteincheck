import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { analyzeProduct } from '../../analysis';
import type { Finding, Severity } from '../../analysis/types';
import { FindingList } from '../../components/FindingList';
import { Icon } from '../../components/Icon';
import { IngredientText } from '../../components/IngredientText';
import { ScoreBadge } from '../../components/ScoreBadge';
import { Section } from '../../components/Section';
import { useI18n } from '../../i18n/I18nProvider';
import { updateSaved, type SavedProduct } from '../../services/db';
import { contributeUrl, productPageUrl } from '../../services/openFoodFacts';
import { useCompareList } from '../../state/compare';
import { useSettings } from '../../state/settings';
import {
  AdditivesSection,
  AllergensSection,
  BlendsSection,
  ClaimSection,
  DensitySection,
  FatsSection,
  FiberSection,
  ProcessingSection,
  QualitySection,
  SaltSection,
  SpikingSection,
  SugarSection,
} from './sections';
import { ValueSection } from './ValueSection';
import { WhyScore } from './WhyScore';

export function statusOf(findings: Finding[]): Severity | undefined {
  for (const s of ['bad', 'warn', 'good', 'info'] as const) if (findings.some((f) => f.severity === s)) return s;
  return undefined;
}

export function ResultsView({ saved, cached, onChange }: { saved: SavedProduct; cached: boolean; onChange: (s: SavedProduct) => void }) {
  const { t, d } = useI18n();
  const { settings } = useSettings();
  const compare = useCompareList();
  const { product } = saved;
  const r = useMemo(
    () =>
      analyzeProduct(product, {
        prefs: settings.prefs,
        ...(saved.price !== undefined ? { price: saved.price } : {}),
        ...(saved.packageSizeG !== undefined ? { packageSizeG: saved.packageSizeG } : {}),
      }),
    [product, settings.prefs, saved.price, saved.packageSizeG],
  );
  const inCompare = compare.ids.includes(saved.id);
  const patch = async (p: Parameters<typeof updateSaved>[1]) => {
    const next = await updateSaved(saved.id, p);
    if (next) onChange(next);
  };
  const missingNutrition = r.density.per100g === undefined || r.density.kcal100g === undefined || r.sugars.sugars100g === undefined;

  return (
    <article className="space-y-4">
      {/* Header */}
      <header className="flex gap-3">
        {product.imageUrl && <img src={product.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-white object-contain" />}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight">{product.name}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{[product.brand, product.quantity, product.barcode].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void patch({ favorite: !saved.favorite })}
              aria-pressed={saved.favorite}
              className={`inline-flex min-h-[44px] items-center gap-1 rounded-full border px-3 text-sm font-medium ${saved.favorite ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <Icon name="star" className={`h-4 w-4 ${saved.favorite ? 'text-amber-500' : 'text-gray-400'}`} />
              {saved.favorite ? t('results.unfavorite') : t('results.favorite')}
            </button>
            <button
              type="button"
              onClick={() => compare.toggle(saved.id)}
              aria-pressed={inCompare}
              className={`inline-flex min-h-[44px] items-center gap-1 rounded-full border px-3 text-sm font-medium ${inCompare ? 'border-brand-600 bg-brand-50 text-brand-900 dark:bg-brand-900 dark:text-brand-50' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <Icon name="compare" className="h-4 w-4" />
              {inCompare ? t('results.inCompare') : t('results.addCompare')}
            </button>
            {compare.ids.length >= 2 && (
              <Link to="/compare" className="inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-brand-700 underline dark:text-brand-100">
                {t('nav.compare')} ({compare.ids.length})
              </Link>
            )}
          </div>
        </div>
      </header>

      {cached && product.source === 'off' && <p className="text-xs text-gray-600 dark:text-gray-400">{t('product.cachedNotice', { date: d(product.fetchedAt) })}</p>}

      {/* Score */}
      <section aria-labelledby="score-heading" className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <ScoreBadge {...(r.score.total !== undefined ? { score: r.score.total } : {})} {...(r.score.grade ? { grade: r.score.grade } : {})} />
        <div>
          <h2 id="score-heading" className="font-bold">{t('results.score')}</h2>
          {r.score.total === undefined ? (
            <>
              <p className="font-medium">{t('results.noScore')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('results.noScoreBody')}</p>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">{t(`results.confidence.${r.score.confidence}`)}</p>
          )}
          <a
            href="#why"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('why');
              if (el instanceof HTMLDetailsElement) el.open = true;
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              el?.querySelector('summary')?.focus({ preventScroll: true });
            }}
            className="mt-1 inline-block min-h-[44px] content-center text-sm font-medium text-brand-700 underline dark:text-brand-100">{t('results.why')}</a>
        </div>
      </section>

      {/* Top flags */}
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40" aria-labelledby="flags-heading">
          <h2 id="flags-heading" className="mb-2 font-bold text-red-900 dark:text-red-200">{t('results.redFlags')}</h2>
          <FindingList findings={r.redFlags} empty={t('results.noRedFlags')} />
        </section>
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40" aria-labelledby="good-heading">
          <h2 id="good-heading" className="mb-2 font-bold text-green-900 dark:text-green-200">{t('results.goodPoints')}</h2>
          <FindingList findings={r.goodPoints} empty={t('results.noGoodPoints')} />
        </section>
      </div>

      {missingNutrition && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
          {t('product.missingData')}{' '}
          <Link to={`/add?mode=manual&edit=${encodeURIComponent(saved.id)}`} className="font-semibold underline">{t('product.editValues')}</Link>
        </p>
      )}

      {/* Ingredients */}
      <Section title={t('results.ingredients')} summary={r.ingredients.length ? t('results.ingredientCount', { count: r.ingredients.length }) : undefined} defaultOpen>
        {product.ingredientsText ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('results.ingredientsHint')}</p>
            <IngredientText text={product.ingredientsText} />
          </>
        ) : (
          <p>{t('product.noIngredients')}</p>
        )}
      </Section>

      <DensitySection r={r} />
      <ClaimSection r={r} />
      <QualitySection r={r} />
      <SpikingSection r={r} />
      <SugarSection r={r} />
      <FatsSection r={r} />
      <FiberSection r={r} />
      <SaltSection r={r} />
      <AdditivesSection r={r} />
      <ProcessingSection r={r} />
      <AllergensSection r={r} />
      <BlendsSection r={r} />
      <ValueSection r={r} saved={saved} onPatch={patch} />
      <WhyScore score={r.score} />

      <footer className="space-y-2 pt-2 text-sm text-gray-600 dark:text-gray-400">
        <p>{t(product.source === 'off' ? 'product.sourceOff' : product.source === 'ocr' ? 'product.sourceOcr' : 'product.sourceManual')}</p>
        {product.barcode && product.source === 'off' && (
          <p className="flex flex-wrap gap-x-4">
            <a className="inline-flex min-h-[44px] items-center gap-1 underline" href={productPageUrl(product.barcode)} target="_blank" rel="noopener noreferrer">{t('product.viewOnOff')} <Icon name="external" className="h-4 w-4" /></a>
            <a className="inline-flex min-h-[44px] items-center gap-1 underline" href={contributeUrl(product.barcode)} target="_blank" rel="noopener noreferrer">{t('product.improve')} <Icon name="external" className="h-4 w-4" /></a>
          </p>
        )}
        {product.source !== 'off' && (
          <p>
            <a className="inline-flex min-h-[44px] items-center gap-1 underline" href={contributeUrl(product.barcode)} target="_blank" rel="noopener noreferrer">{t('product.contribute')} <Icon name="external" className="h-4 w-4" /></a>
          </p>
        )}
        <p>{t('results.disclaimer')}</p>
      </footer>
    </article>
  );
}
