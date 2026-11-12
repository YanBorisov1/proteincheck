import type { AnalysisResult } from '../../analysis';
import { EU_CLAIMS, REFERENCE_INTAKES } from '../../analysis/config';
import { perServing } from '../../analysis/nutrition';
import { ConcernPill } from '../../components/ConcernPill';
import { FindingList } from '../../components/FindingList';
import { DataRow, Explain, Section } from '../../components/Section';
import { useI18n } from '../../i18n/I18nProvider';
import { useSettings } from '../../state/settings';
import { formatEnergy, formatGrams } from '../../utils/format';
import { statusOf } from './ResultsView';

type P = { r: AnalysisResult };

const range = (r: readonly [number, number]) => (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`);

export function DensitySection({ r }: P) {
  const { t, n } = useI18n();
  const { settings } = useSettings();
  const d = r.density;
  return (
    <Section title={t('section.density')} status={statusOf(d.findings)} summary={d.energyPct !== undefined ? `${d.energyPct}% · ${t('density.energyPct')}` : undefined}>
      <dl>
        <DataRow label={t('density.per100g')} value={formatGrams(d.per100g, n)} />
        {d.perServing !== undefined && <DataRow label={t('density.perServing', { serving: r.product.servingSizeG ?? '' })} value={formatGrams(d.perServing, n)} />}
        <DataRow label={t('density.per100kcal')} value={formatGrams(d.per100kcal, n)} />
        <DataRow label={t('density.energyPct')} value={d.energyPct !== undefined ? `${d.energyPct}%` : '—'} />
        <DataRow label={t('density.energy')} value={formatEnergy(d.kcal100g, settings.energyUnit, n)} {...(d.kcalEstimated && d.kcal100g !== undefined ? { note: t('density.estimated') } : {})} />
      </dl>
      {d.energyPct !== undefined && (
        <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="h-full bg-brand-600" style={{ width: `${Math.min(100, d.energyPct)}%` }} />
        </div>
      )}
      <FindingList findings={d.findings} />
      <Explain>{t('density.explain')}</Explain>
    </Section>
  );
}

export function ClaimSection({ r }: P) {
  const { t } = useI18n();
  const c = r.claim;
  const mark = (ok: boolean | undefined) => (ok === undefined ? '—' : ok ? `✓ ${t('common.yes')}` : `✗ ${t('common.no')}`);
  return (
    <Section title={t('section.claim')} status={statusOf(c.findings)} summary={t(`claim.kind.${c.claim}`)}>
      <dl>
        <DataRow label={t('claim.detected')} value={t(`claim.kind.${c.claim}`)} />
        <DataRow label={t('claim.ruleSource', { pct: EU_CLAIMS.sourceOfProteinPct })} value={mark(c.meetsSource)} />
        <DataRow label={t('claim.ruleHigh', { pct: EU_CLAIMS.highProteinPct })} value={mark(c.meetsHigh)} />
        <DataRow label={t('claim.thisProduct')} value={c.energyPct !== undefined ? `${c.energyPct}%` : '—'} />
      </dl>
      <FindingList findings={c.findings} />
      <Explain>{t('claim.explain')}</Explain>
    </Section>
  );
}

export function QualitySection({ r }: P) {
  const { t } = useI18n();
  const q = r.quality;
  return (
    <Section title={t('section.quality')} status={statusOf(q.findings)} summary={q.main ? `${t('quality.main')}: ${t(`source.${q.main.source.id}`)}` : undefined}>
      {q.sources.length === 0 ? (
        <p>{t('quality.none')}</p>
      ) : (
        <>
          <h3 className="font-semibold">{t('quality.sources')}</h3>
          <ul className="space-y-2">
            {q.sources.map((s) => (
              <li key={s.source.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{t(`source.${s.source.id}`)}</span>
                  <span className={`text-xs font-semibold ${s.source.complete ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
                    {s.source.complete ? t('quality.complete') : t('quality.incomplete')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">“{s.matchedText}”</p>
                <p className="text-sm">
                  {t('quality.pdcaas')} {range(s.source.pdcaas)} · {t('quality.diaas')} {range(s.source.diaas)}
                  {s.source.limiting ? ` · ${t('quality.limiting', { aa: s.source.limiting })}` : ''}
                </p>
                <p className="mt-1 text-sm">{t(`sourceNote.${s.source.id}`)}</p>
              </li>
            ))}
          </ul>
          {q.estimatedPdcaas !== undefined && <p className="font-medium">{t('quality.estimate', { value: q.estimatedPdcaas })}</p>}
        </>
      )}
      <FindingList findings={q.findings} />
      <Explain>{t('quality.explain')}</Explain>
    </Section>
  );
}

export function SpikingSection({ r }: P) {
  const { t } = useI18n();
  const s = r.spiking;
  return (
    <Section title={t('section.spiking')} status={statusOf(s.findings)} summary={s.agents.length ? s.agents.map((a) => a.agent.name).join(', ') : undefined}>
      {s.agents.length === 0 ? (
        <p>{t('spiking.none')}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {s.agents.map((a) => (
            <li key={a.agent.id}>
              <span className="font-semibold">{a.agent.name}</span>
              {a.agent.nonProtein && <span className="text-sm text-gray-600 dark:text-gray-400"> ({t('spiking.nonProtein')})</span>}
            </li>
          ))}
        </ul>
      )}
      <FindingList findings={s.findings.filter((f) => f.code !== 'spiking.none')} />
      <Explain>{t('spiking.explain')}</Explain>
    </Section>
  );
}

export function SugarSection({ r }: P) {
  const { t, n } = useI18n();
  const s = r.sugars;
  const serving = perServing(s.sugars100g, r.product.servingSizeG);
  return (
    <Section title={t('section.sugar')} status={statusOf(s.findings)} summary={s.sugars100g !== undefined ? `${n(s.sugars100g)} g / 100 g` : undefined}>
      <dl>
        <DataRow label={t('sugar.total')} value={formatGrams(s.sugars100g, n)} />
        {s.addedSugars100g !== undefined && <DataRow label={t('sugar.added')} value={formatGrams(s.addedSugars100g, n)} />}
        {serving !== undefined && <DataRow label={t('sugar.perServing')} value={formatGrams(serving, n)} />}
        <DataRow label={t('sugar.ratio')} value={s.sugarToProtein !== undefined ? `${n(s.sugarToProtein, 2)} g` : '—'} />
        {s.polyols100g !== undefined && <DataRow label={t('sugar.polyols')} value={formatGrams(s.polyols100g, n)} />}
      </dl>
      <div>
        <h3 className="font-semibold">{t('sugar.addedIngredients')}</h3>
        <p>{s.addedSugarIngredients.length ? s.addedSugarIngredients.join(', ') : t('sugar.noneFound')}</p>
      </div>
      <div>
        <h3 className="font-semibold">{t('sugar.alcohols')}</h3>
        {s.sugarAlcohols.length === 0 ? (
          <p>{t('sugar.noneFound')}</p>
        ) : (
          <ul className="space-y-2">
            {s.sugarAlcohols.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.name}</span>: {t(p.noteCode)} <span className="text-sm text-gray-600 dark:text-gray-400">{t('sugar.threshold', { threshold: p.laxativeThresholdG })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-semibold">{t('sugar.sweeteners')}</h3>
        <p>{s.sweeteners.length ? s.sweeteners.map((x) => x.name).join(', ') : t('sugar.noneFound')}</p>
      </div>
      <FindingList findings={s.findings} />
    </Section>
  );
}

export function FatsSection({ r }: P) {
  const { t, n } = useI18n();
  const f = r.fats;
  const yesNo = (v: boolean) => (v ? t('fats.found') : t('fats.notFound'));
  return (
    <Section title={t('section.fats')} status={statusOf(f.findings)} summary={f.saturatedFat100g !== undefined ? `${n(f.saturatedFat100g)} g sat. / 100 g` : undefined}>
      <dl>
        <DataRow label={t('fats.total')} value={formatGrams(f.fat100g, n)} />
        <DataRow label={t('fats.saturated')} value={formatGrams(f.saturatedFat100g, n)} />
        {f.transFat100g !== undefined && <DataRow label={t('fats.trans')} value={formatGrams(f.transFat100g, n)} />}
        <DataRow label={t('fats.palm')} value={yesNo(f.palm)} />
        <DataRow label={t('fats.hydrogenated')} value={yesNo(f.hydrogenated)} />
      </dl>
      <FindingList findings={f.findings} />
    </Section>
  );
}

export function FiberSection({ r }: P) {
  const { t, n } = useI18n();
  const f = r.fillers;
  return (
    <Section title={t('section.fiber')} status={statusOf(f.findings)} summary={f.fiber100g !== undefined ? `${n(f.fiber100g)} g / 100 g` : undefined}>
      <dl>
        <DataRow label={t('fiber.total')} value={formatGrams(f.fiber100g, n)} />
      </dl>
      <div>
        <h3 className="font-semibold">{t('fiber.fillers')}</h3>
        <p>{f.fillers.length ? f.fillers.map((x) => x.matchedText).join(', ') : t('sugar.noneFound')}</p>
      </div>
      <div>
        <h3 className="font-semibold">{t('fiber.isolated')}</h3>
        <p>{f.isolatedFibers.length ? f.isolatedFibers.map((x) => x.matchedText).join(', ') : t('sugar.noneFound')}</p>
      </div>
      <FindingList findings={f.findings} />
    </Section>
  );
}

export function SaltSection({ r }: P) {
  const { t, n } = useI18n();
  const { settings } = useSettings();
  const s = r.salt;
  const sodium = settings.saltUnit === 'sodium';
  return (
    <Section title={t('section.salt')} status={statusOf(s.findings)} summary={s.saltPerServing !== undefined ? `${n(s.saltPerServing, 2)} g ${t('common.perServing')}` : undefined}>
      <dl>
        {sodium ? (
          <DataRow label={t('salt.sodium100g')} value={s.sodium100g !== undefined ? `${n(s.sodium100g * 1000, 0)} mg` : '—'} />
        ) : (
          <DataRow label={t('salt.per100g')} value={formatGrams(s.salt100g, n, 2)} />
        )}
        {s.saltPerServing !== undefined && (
          <DataRow
            label={t('salt.perServing')}
            value={sodium ? `${n((s.saltPerServing / 2.5) * 1000, 0)} mg` : formatGrams(s.saltPerServing, n, 2)}
            {...(s.servingPctOfRI !== undefined ? { note: t('salt.ri', { pct: s.servingPctOfRI }) } : {})}
          />
        )}
      </dl>
      <p className="text-xs text-gray-600 dark:text-gray-400">RI: {REFERENCE_INTAKES.salt} g</p>
      <FindingList findings={s.findings} />
    </Section>
  );
}

export function AdditivesSection({ r }: P) {
  const { t } = useI18n();
  const a = r.additives;
  return (
    <Section title={t('section.additives')} status={statusOf(a.findings)} summary={a.additives.length ? t('additives.count', { count: a.additives.length }) : t('additives.none')}>
      {a.additives.length === 0 ? (
        <p>{t('additives.none')}</p>
      ) : (
        <ul className="space-y-2">
          {a.additives.map((x) => (
            <li key={x.code} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{x.entry ? `${x.entry.eNumber ? `${x.entry.eNumber} · ` : ''}${x.entry.name}` : x.code}</span>
                {x.entry ? <ConcernPill concern={x.entry.concern} /> : <span className="text-xs">{t('additives.unknown')}</span>}
              </div>
              {x.entry && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{x.entry.category}</p>
                  <p className="mt-1 text-sm">{x.entry.explanation}</p>
                  <a href={x.entry.source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-brand-700 underline dark:text-brand-100">{t('common.source')}</a>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <FindingList findings={a.findings} />
      <Explain>{t('additives.explain')}</Explain>
    </Section>
  );
}

export function ProcessingSection({ r }: P) {
  const { t } = useI18n();
  const p = r.processing;
  return (
    <Section title={t('section.processing')} status={statusOf(p.findings)} summary={p.nova ? `NOVA ${p.nova}` : undefined}>
      <dl>
        <DataRow label={t('processing.nova')} value={p.nova ? t(`processing.nova${p.nova}`) : '—'} {...(p.novaEstimated && p.nova ? { note: t('processing.novaEstimated') } : {})} />
        <DataRow label={t('processing.count')} value={p.ingredientCount || '—'} />
      </dl>
      {p.markers.length > 0 && (
        <div>
          <h3 className="font-semibold">{t('processing.markers')}</h3>
          <p className="text-sm">{[...new Set(p.markers)].slice(0, 12).join(', ')}</p>
        </div>
      )}
      <FindingList findings={p.findings} />
      <Explain>{t('processing.explain')}</Explain>
    </Section>
  );
}

export function AllergensSection({ r }: P) {
  const { t } = useI18n();
  const a = r.allergens;
  const status = (s: 'yes' | 'no' | 'maybe') => (s === 'yes' ? `✓ ${t('common.yes')}` : s === 'no' ? `✗ ${t('common.no')}` : `? ${t('common.maybe')}`);
  return (
    <Section title={t('section.allergens')} status={statusOf(a.findings) ?? (a.contains.length ? 'info' : undefined)} summary={a.contains.map((x) => t(`allergens.${x}`)).join(', ') || undefined}>
      <dl>
        <DataRow label={t('allergens.contains')} value={a.contains.length ? a.contains.map((x) => t(`allergens.${x}`)).join(', ') : t('allergens.noneDetected')} />
        <DataRow label={t('allergens.mayContain')} value={a.mayContain.length ? a.mayContain.map((x) => t(`allergens.${x}`)).join(', ') : '—'} />
        <DataRow label={t('diet.vegan')} value={status(a.vegan)} />
        <DataRow label={t('diet.vegetarian')} value={status(a.vegetarian)} />
        <DataRow label={t('diet.lactoseFree')} value={status(a.lactoseFree)} />
        <DataRow label={t('diet.glutenFree')} value={status(a.glutenFree)} />
      </dl>
      <FindingList findings={a.findings} />
      <Explain>{t('allergens.warning')}</Explain>
    </Section>
  );
}

export function BlendsSection({ r }: P) {
  const { t } = useI18n();
  const b = r.blends;
  return (
    <Section title={t('section.blends')} status={statusOf(b.findings)}>
      {b.blends.length === 0 ? (
        <p>{t('blends.none')}</p>
      ) : (
        <ul className="space-y-1">
          {b.blends.map((x) => (
            <li key={x.text}>
              <span className="font-medium">{x.text}</span> — {x.disclosed ? t('blends.disclosed') : t('blends.hidden')}
            </li>
          ))}
        </ul>
      )}
      <FindingList findings={b.findings} />
      <Explain>{t('blends.explain')}</Explain>
    </Section>
  );
}
