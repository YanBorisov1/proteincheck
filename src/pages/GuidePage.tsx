import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { getGuides } from '../content/guides';
import { useI18n } from '../i18n/I18nProvider';

export default function GuidePage() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const guide = getGuides(locale).find((g) => g.id === id);
  return (
    <article className="space-y-4">
      <Link to="/learn" className="inline-flex min-h-[44px] items-center gap-1 font-medium text-brand-700 dark:text-brand-100">
        <Icon name="back" className="h-5 w-5" /> {t('learn.title')}
      </Link>
      {!guide ? (
        <p>{t('home.searchNone')}</p>
      ) : (
        <>
          <h1 className="text-2xl font-bold">{guide.title}</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">{guide.summary}</p>
          {guide.sections.map((s) => (
            <section key={s.heading} className="space-y-2">
              <h2 className="text-lg font-semibold">{s.heading}</h2>
              {s.paragraphs.map((p) => <p key={p} className="leading-relaxed">{p}</p>)}
              {s.list && <ul className="list-disc space-y-1 pl-5">{s.list.map((li) => <li key={li}>{li}</li>)}</ul>}
            </section>
          ))}
        </>
      )}
    </article>
  );
}
