import { getAdditive } from '../analysis/additives';
import { INTENSE_SWEETENERS, PROTEIN_SOURCES, SPIKING_AGENTS, SUGAR_ALCOHOLS } from '../analysis/lexicon';
import { useI18n } from '../i18n/I18nProvider';
import { hasKey } from '../i18n';
import { ConcernPill } from './ConcernPill';
import { Icon } from './Icon';

/** Title + explanation for a highlighted ingredient reference such as "additive:E322". */
export function useTermInfo(ref: string | null, fallbackTitle: string) {
  const { t } = useI18n();
  if (!ref) return { title: '', body: null };
  const [kind, id = ''] = ref.split(':');
  switch (kind) {
    case 'protein': {
      const s = PROTEIN_SOURCES.find((x) => x.id === id);
      if (!s) break;
      const pct = (r: readonly [number, number]) => (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`);
      return {
        title: t(`source.${s.id}`),
        body: (
          <>
            <p>{t(`sourceNote.${s.id}`)}</p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800"><dt className="text-gray-600 dark:text-gray-400">{t('quality.pdcaas')}</dt><dd className="font-semibold">{pct(s.pdcaas)}</dd></div>
              <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800"><dt className="text-gray-600 dark:text-gray-400">{t('quality.diaas')}</dt><dd className="font-semibold">{pct(s.diaas)}</dd></div>
            </dl>
            <p className="text-sm font-medium">{s.complete ? t('quality.complete') : t('quality.incomplete')}{s.limiting ? ` · ${t('quality.limiting', { aa: s.limiting })}` : ''}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{t('quality.explain')}</p>
          </>
        ),
      };
    }
    case 'additive': {
      const a = getAdditive(id);
      if (!a) return { title: id, body: <p>{t('term.unknownAdditive')}</p> };
      return {
        title: a.eNumber ? `${a.eNumber} · ${a.name}` : a.name,
        body: (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <ConcernPill concern={a.concern} />
              <span className="text-sm text-gray-600 dark:text-gray-400">{a.category}</span>
            </div>
            <p>{a.explanation}</p>
            <a href={a.source} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 text-brand-700 underline dark:text-brand-100">
              {t('common.source')} <Icon name="external" className="h-4 w-4" />
            </a>
          </>
        ),
      };
    }
    case 'polyol': {
      const p = SUGAR_ALCOHOLS.find((x) => x.id === id);
      if (!p) break;
      return {
        title: `${p.name}${p.eNumber ? ` (${p.eNumber})` : ''}`,
        body: (
          <>
            <p>{t(p.noteCode)}</p>
            <p className="text-sm">{t('sugar.threshold', { threshold: p.laxativeThresholdG })}</p>
          </>
        ),
      };
    }
    case 'sweetener': {
      const s = INTENSE_SWEETENERS.find((x) => x.id === id);
      const additive = s?.eNumber ? getAdditive(s.eNumber) : undefined;
      return {
        title: s ? `${s.name}${s.eNumber ? ` (${s.eNumber})` : ''}` : fallbackTitle,
        body: (
          <>
            {additive && <ConcernPill concern={additive.concern} />}
            <p>{additive?.explanation ?? t('term.sweetener')}</p>
          </>
        ),
      };
    }
    case 'spiking': {
      const s = SPIKING_AGENTS.find((x) => x.id === id);
      return {
        title: s?.name ?? fallbackTitle,
        body: (
          <>
            <p>{t('term.spiking')}</p>
            {s?.nonProtein && <p className="font-medium">{t('spiking.nonProtein')}</p>}
          </>
        ),
      };
    }
    case 'filler': {
      const key = `term.filler.${id}`;
      return { title: fallbackTitle, body: <p>{hasKey(key) ? t(key) : t('term.blend')}</p> };
    }
    case 'fat':
      return { title: fallbackTitle, body: <p>{t(`term.fat.${id}`)}</p> };
    case 'sugar':
      return { title: fallbackTitle, body: <p>{t('term.sugar')}</p> };
    case 'blend':
      return { title: fallbackTitle, body: <p>{t('term.blend')}</p> };
  }
  return { title: fallbackTitle, body: null };
}
