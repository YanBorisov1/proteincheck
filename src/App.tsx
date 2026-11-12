import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { I18nProvider, useI18n } from './i18n/I18nProvider';
import { HomePage } from './pages/HomePage';
import { SettingsProvider, useSettings } from './state/settings';

const ScannerPage = lazy(() => import('./pages/ScannerPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const AddProductPage = lazy(() => import('./pages/AddProductPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const LearnPage = lazy(() => import('./pages/LearnPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function Loading() {
  const { t } = useI18n();
  return <Spinner label={t('common.loading')} />;
}

function Routed() {
  const { settings } = useSettings();
  return (
    <I18nProvider locale={settings.language}>
      {/* HashRouter: works from any static host and from the offline cache without server rewrites. */}
      <HashRouter>
        <Layout>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/scan" element={<ScannerPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/add" element={<AddProductPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/learn/:id" element={<GuidePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </Layout>
      </HashRouter>
    </I18nProvider>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <Routed />
    </SettingsProvider>
  );
}
