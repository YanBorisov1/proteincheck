import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useOnline } from '../state/online';
import { Icon, type IconName } from './Icon';

const NAV: Array<{ to: string; icon: IconName; label: 'nav.home' | 'nav.scan' | 'nav.compare' | 'nav.history' | 'nav.learn' }> = [
  { to: '/', icon: 'home', label: 'nav.home' },
  { to: '/scan', icon: 'scan', label: 'nav.scan' },
  { to: '/compare', icon: 'compare', label: 'nav.compare' },
  { to: '/history', icon: 'history', label: 'nav.history' },
  { to: '/learn', icon: 'learn', label: 'nav.learn' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const online = useOnline();
  const { pathname } = useLocation();

  // Move focus to the main region on navigation so screen readers announce the new page.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-brand-700 px-4 py-2 text-white shadow dark:bg-gray-900" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <Link to="/" className="flex min-h-[44px] flex-1 items-center gap-2 text-lg font-bold">
          <img src="./icon.svg" alt="" className="h-7 w-7 rounded-md" width={28} height={28} />
          {t('app.name')}
        </Link>
        <Link to="/settings" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label={t('nav.settings')}>
          <Icon name="settings" />
        </Link>
      </header>
      {!online && (
        <div role="status" className="bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:bg-amber-900 dark:text-amber-50">
          {t('common.offline')}
        </div>
      )}
      <main id="main" tabIndex={-1} className="flex-1 px-4 pb-28 pt-4 outline-none">
        {children}
      </main>
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-2xl">
          {NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                    isActive ? 'text-brand-700 dark:text-brand-100' : 'text-gray-600 dark:text-gray-400'
                  }`
                }
              >
                <Icon name={item.icon} />
                {t(item.label)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
