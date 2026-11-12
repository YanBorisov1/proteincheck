import { Link } from 'react-router-dom';
import { PageTitle } from '../components/ui';
import { getGuides } from '../content/guides';
import { useI18n } from '../i18n/I18nProvider';

export default function LearnPage() {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-4">
      <PageTitle>{t('learn.title')}</PageTitle>
      <p className="text-gray-700 dark:text-gray-300">{t('learn.intro')}</p>
      <ul className="space-y-3">
        {getGuides(locale).map((g) => (
          <li key={g.id}>
            <Link to={`/learn/${g.id}`} className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-600 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="font-semibold">{g.title}</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">{g.summary}</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{t('learn.readTime', { min: g.minutes })}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
