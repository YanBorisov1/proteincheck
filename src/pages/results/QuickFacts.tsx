import type { AnalysisResult } from '../../analysis';
import { SUGAR_PROTEIN_RATIO, TRAFFIC_LIGHTS } from '../../analysis/config';
import { perServing } from '../../analysis/nutrition';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n';
import { useSettings } from '../../state/settings';
import { formatEnergy } from '../../utils/format';

type Level = 'good' | 'ok' | 'warn' | 'bad' | 'neutral';

const CHIP: Record<Level, string> = {
  good: 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200',
  ok: 'bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-200',
  warn: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
  bad: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const BAR: Record<Level, string> = {
  good: 'border-t-green-600',
  ok: 'border-t-lime-600',
  warn: 'border-t-orange-500',
  bad: 'border-t-red-600',
  neutral: 'border-t-gray-300 dark:border-t-gray-600',
};

function Tile({ label, value, sub, level, chip }: { label: string; value: string; sub?: string; level: Level; chip?: string }) {
  return (
    <div className={`flex flex-col rounded-xl border border-t-4 border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 ${BAR[level]}`}>
      <dt className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</dt>
      <dd className="mt-1 flex-1">
        <span className="block text-2xl font-extrabold leading-tight tabular-nums">{value}</span>
        {sub && <span className="mt-0.5 block text-xs text-gray-600 dark:text-gray-400">{sub}</span>}
        {chip && <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[level]}`}>{chip}</span>}
      </dd>
    </div>
  );
}

/** The four facts most people want at a glance. Each has a text label, never colour alone. */
export function QuickFacts({ r }: { r: AnalysisResult }) {
  const { t, n } = useI18n();
  const { settings } = useSettings();
  const serving = r.product.servingSizeG;
  const hasServing = serving !== undefined && serving > 0;
  const caption = hasServing ? t('nutrition.perServing', { g: n(serving ?? 0, 0) }) : t('nutrition.per100');
  const g = (v: number | undefined) => (v === undefined ? '—' : `${n(v, v < 10 ? 1 : 0)} g`);

  // Calories
  const e = r.energy;
  const kcalMain = hasServing ? e.kcalPerServing : e.kcal100g;
  const kcalSub = hasServing && e.kcal100g !== undefined ? `${formatEnergy(e.kcal100g, settings.energyUnit, n)} ${t('common.per100g')}` : undefined;

  // Protein
  const d = r.density;
  const proteinMain = hasServing ? d.perServing : d.per100g;
  const pct = d.energyPct;
  const proteinLevel: Level = pct === undefined ? 'neutral' : pct >= 30 ? 'good' : pct >= 20 ? 'ok' : pct >= 12 ? 'warn' : 'bad';
  const proteinChip: MessageKey | undefined = pct === undefined ? undefined : pct >= 30 ? 'quick.protein.high' : pct >= 20 ? 'quick.protein.ok' : pct >= 12 ? 'quick.protein.modest' : 'quick.protein.low';

  // Sugar
  const s = r.sugars;
  const sugarMain = hasServing ? perServing(s.sugars100g, serving) : s.sugars100g;
  const sugarLevel: Level =
    s.sugars100g === undefined
      ? 'neutral'
      : s.sugars100g > TRAFFIC_LIGHTS.sugars.high || (s.sugarToProtein ?? 0) >= SUGAR_PROTEIN_RATIO.bad
        ? 'bad'
        : s.sugars100g <= TRAFFIC_LIGHTS.sugars.low
          ? 'good'
          : s.sugars100g <= 10
            ? 'ok'
            : 'warn';
  const sugarChip: Record<Level, MessageKey | undefined> = { good: 'quick.sugar.low', ok: 'quick.sugar.ok', warn: 'quick.sugar.medium', bad: 'quick.sugar.high', neutral: undefined };

  // Protein quality
  const q = r.quality;
  const main = q.main?.source;
  const spiked = r.spiking.agents.length > 0;
  const qualityLevel: Level = !main
    ? 'neutral'
    : main.id === 'collagen' || main.id === 'beef'
      ? 'bad'
      : spiked || (!main.complete && !q.complementary)
        ? 'warn'
        : 'good';
  const qualityChip: Record<Level, MessageKey | undefined> = {
    good: 'quick.quality.complete',
    ok: 'quick.quality.complete',
    warn: spiked ? 'quick.quality.spiked' : 'quick.quality.incomplete',
    bad: 'quick.quality.poor',
    neutral: undefined,
  };

  const chip = (k: MessageKey | undefined) => (k ? t(k) : undefined);
  const opt = (v: string | undefined) => (v === undefined ? {} : { sub: v });

  return (
    <section aria-labelledby="quick-heading">
      <h2 id="quick-heading" className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        <span className="sr-only">{t('quick.title')}: </span>
        {caption}
      </h2>
      <dl className="grid grid-cols-2 gap-3">
        <Tile
          label={t('quick.calories')}
          value={formatEnergy(kcalMain, settings.energyUnit, n)}
          {...opt(kcalSub)}
          level="neutral"
          {...(hasServing && e.servingPctOfRI !== undefined ? { chip: t('quick.calories.ri', { pct: e.servingPctOfRI }) } : {})}
        />
        <Tile
          label={t('quick.protein')}
          value={g(proteinMain)}
          {...opt(pct !== undefined ? t('quick.protein.pct', { pct }) : undefined)}
          level={proteinLevel}
          {...(proteinChip ? { chip: t(proteinChip) } : {})}
        />
        <Tile
          label={t('quick.sugar')}
          value={g(sugarMain)}
          {...opt(s.sugarToProtein !== undefined ? t('quick.sugar.ratio', { ratio: n(s.sugarToProtein, 2) }) : undefined)}
          level={sugarLevel}
          {...(chip(sugarChip[sugarLevel]) ? { chip: chip(sugarChip[sugarLevel]) } : {})}
        />
        <Tile
          label={t('quick.quality')}
          value={main ? t(`source.${main.id}`) : '—'}
          {...opt(main ? undefined : t('quick.quality.unknown'))}
          level={qualityLevel}
          {...(chip(qualityChip[qualityLevel]) ? { chip: chip(qualityChip[qualityLevel]) } : {})}
        />
      </dl>
    </section>
  );
}
