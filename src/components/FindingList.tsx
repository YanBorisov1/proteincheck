import type { Finding } from '../analysis/types';
import { useI18n } from '../i18n/I18nProvider';
import { findingText } from '../utils/format';
import { Icon } from './Icon';

const STYLE = {
  bad: { icon: 'alert', cls: 'text-red-700 dark:text-red-400' },
  warn: { icon: 'alert', cls: 'text-orange-700 dark:text-orange-400' },
  good: { icon: 'check', cls: 'text-green-700 dark:text-green-400' },
  info: { icon: 'info', cls: 'text-sky-700 dark:text-sky-400' },
} as const;

export function FindingList({ findings, empty }: { findings: Finding[]; empty?: string }) {
  const { t } = useI18n();
  if (findings.length === 0) return empty ? <p className="text-sm text-gray-600 dark:text-gray-400">{empty}</p> : null;
  return (
    <ul className="space-y-2">
      {findings.map((f) => (
        <li key={f.code} className="flex gap-2">
          <span className={`${STYLE[f.severity].cls} mt-0.5`}>
            <Icon name={STYLE[f.severity].icon} className="h-5 w-5" />
          </span>
          <span>{findingText(t, f)}</span>
        </li>
      ))}
    </ul>
  );
}
