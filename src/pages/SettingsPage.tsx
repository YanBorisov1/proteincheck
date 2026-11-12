import { useEffect, useState } from 'react';
import type { DietaryPrefs } from '../analysis/types';
import { Button, Card, PageTitle } from '../components/ui';
import { LOCALES, type LocaleCode } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import { useSettings, type Theme } from '../state/settings';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'CAD', 'AUD', 'INR', 'BRL', 'MXN', 'JPY', 'ZAR'];
const SELECT = 'min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3 text-base dark:border-gray-600 dark:bg-gray-800';

function Segmented<T extends string>({ name, legend, value, options, onChange }: {
  name: string;
  legend: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="flex gap-1 rounded-xl bg-gray-200 p-1 dark:bg-gray-800">
        {options.map((o) => (
          <label key={o.value} className={`flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold ${value === o.value ? 'bg-white shadow dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const prefKeys: Array<keyof DietaryPrefs> = ['vegan', 'vegetarian', 'lactoseFree', 'glutenFree', 'nutFree', 'soyFree', 'eggFree'];

  return (
    <div className="space-y-4">
      <PageTitle>{t('settings.title')}</PageTitle>

      <Card className="space-y-4">
        <div>
          <label htmlFor="lang" className="mb-1 block text-sm font-medium">{t('settings.language')}</label>
          <select id="lang" className={SELECT} value={settings.language} onChange={(e) => update({ language: e.target.value as LocaleCode })}>
            {Object.entries(LOCALES).map(([code, l]) => <option key={code} value={code}>{l.name}</option>)}
          </select>
        </div>
        <Segmented<Theme>
          name="theme"
          legend={t('settings.theme')}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
        />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">{t('settings.units')}</h2>
        <Segmented name="energy" legend={t('settings.energyUnit')} value={settings.energyUnit} onChange={(energyUnit) => update({ energyUnit })} options={[{ value: 'kcal', label: 'kcal' }, { value: 'kj', label: 'kJ' }]} />
        <Segmented name="salt" legend={t('settings.saltUnit')} value={settings.saltUnit} onChange={(saltUnit) => update({ saltUnit })} options={[{ value: 'salt', label: t('settings.salt') }, { value: 'sodium', label: t('settings.sodium') }]} />
        <div>
          <label htmlFor="currency" className="mb-1 block text-sm font-medium">{t('settings.currency')}</label>
          <select id="currency" className={SELECT} value={settings.currency} onChange={(e) => update({ currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      <Card>
        <fieldset>
          <legend className="font-semibold">{t('settings.diet')}</legend>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">{t('settings.dietHint')}</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {prefKeys.map((k) => (
              <label key={k} className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-brand-700"
                  checked={settings.prefs[k]}
                  onChange={(e) => update({ prefs: { ...settings.prefs, [k]: e.target.checked } })}
                />
                {t(`settings.pref.${k}`)}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      {installEvent && (
        <Card className="space-y-2">
          <h2 className="font-semibold">{t('settings.install')}</h2>
          <p className="text-sm">{t('settings.installHint')}</p>
          <Button onClick={() => void installEvent.prompt().then(() => setInstallEvent(null))}>{t('settings.install')}</Button>
        </Card>
      )}

      <Card className="space-y-2 text-sm">
        <h2 className="text-base font-semibold">{t('settings.about')}</h2>
        <p>{t('settings.aboutBody')}</p>
        <p>
          {t('settings.dataCredit')}{' '}
          <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline dark:text-brand-100">openfoodfacts.org</a>
        </p>
        <p className="text-gray-600 dark:text-gray-400">{t('settings.version', { version: __APP_VERSION__ })}</p>
      </Card>
    </div>
  );
}
