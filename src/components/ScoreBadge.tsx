import type { Grade } from '../analysis/config';
import { useI18n } from '../i18n/I18nProvider';

/** Colours chosen for ≥4.5:1 contrast with their text colour. */
export const GRADE_STYLES: Record<Grade, string> = {
  A: 'bg-green-700 text-white',
  B: 'bg-lime-700 text-white',
  C: 'bg-amber-400 text-gray-950',
  D: 'bg-orange-700 text-white',
  E: 'bg-red-700 text-white',
};

export function ScoreBadge({ score, grade, size = 'lg' }: { score?: number; grade?: Grade; size?: 'sm' | 'lg' }) {
  const { t } = useI18n();
  const dims = size === 'lg' ? 'h-24 w-24 text-4xl' : 'h-11 w-11 text-lg';
  if (score === undefined || grade === undefined) {
    return (
      <div className={`${dims} flex shrink-0 items-center justify-center rounded-2xl bg-gray-200 font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200`} role="img" aria-label={t('results.noScore')}>
        ?
      </div>
    );
  }
  return (
    <div
      className={`${dims} ${GRADE_STYLES[grade]} flex shrink-0 flex-col items-center justify-center rounded-2xl font-extrabold leading-none shadow`}
      role="img"
      aria-label={t('results.scoreOf', { score, grade })}
    >
      <span>{grade}</span>
      {size === 'lg' && <span className="mt-1 text-base font-semibold">{score}</span>}
    </div>
  );
}
