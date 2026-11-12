import type { Concern } from '../analysis/types';
import { useI18n } from '../i18n/I18nProvider';

export const CONCERN_STYLES: Record<Concern, string> = {
  none: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  limited: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  moderate: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
  high: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
};

export function ConcernPill({ concern }: { concern: Concern }) {
  const { t } = useI18n();
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CONCERN_STYLES[concern]}`}>{t(`additives.concern.${concern}`)}</span>;
}
