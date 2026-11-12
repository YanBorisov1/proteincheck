import type { ScoreResult } from '../../analysis';
import { Section } from '../../components/Section';
import { useI18n } from '../../i18n/I18nProvider';
import { GRADE_THRESHOLDS } from '../../analysis/config';

export function WhyScore({ score }: { score: ScoreResult }) {
  const { t } = useI18n();
  return (
    <Section id="why" title={t('results.why')} summary={score.total !== undefined ? `${score.total}/100 · ${score.grade}` : t('results.noScore')}>
      <p className="text-sm">{t('results.formula')}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{t('results.why')}</caption>
          <thead>
            <tr className="border-b border-gray-200 text-left dark:border-gray-700">
              <th scope="col" className="py-2 pr-2"> </th>
              <th scope="col" className="py-2 pr-2 text-right">0–100</th>
              <th scope="col" className="py-2 pr-2 text-right">×</th>
              <th scope="col" className="py-2 text-right">=</th>
            </tr>
          </thead>
          <tbody>
            {score.subScores.map((s) => (
              <tr key={s.key} className="border-b border-gray-100 align-top dark:border-gray-800">
                <th scope="row" className="py-2 pr-2 text-left font-medium">
                  {t(`subscore.${s.key}`)}
                  <ul className="mt-1 space-y-0.5 font-normal text-gray-600 dark:text-gray-400">
                    {s.reasons.map((reason, i) => (
                      <li key={i}>
                        {t(`reason.${reason.code}`, reason.params)}
                        {reason.delta !== undefined && <span className="ml-1 font-semibold tabular-nums">({reason.delta > 0 ? '+' : ''}{reason.delta})</span>}
                      </li>
                    ))}
                  </ul>
                </th>
                <td className="py-2 pr-2 text-right tabular-nums">{s.score ?? <span className="text-gray-500">{t('results.subScoreNoData')}</span>}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{Math.round(s.weight * 100)}%</td>
                <td className="py-2 text-right font-semibold tabular-nums">{s.score !== null ? (s.score * s.weight).toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="py-2 text-left">{t('results.total')}</th>
              <td colSpan={3} className="py-2 text-right text-base font-bold tabular-nums">
                {score.total !== undefined ? `${score.total} → ${score.grade}` : '—'}
                {score.total !== undefined && score.coverage < 1 && <span className="block text-xs font-normal">÷ {Math.round(score.coverage * 100)}%</span>}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">{GRADE_THRESHOLDS.map(([g, min]) => `${g} ≥ ${min}`).join(' · ')}</p>
    </Section>
  );
}
