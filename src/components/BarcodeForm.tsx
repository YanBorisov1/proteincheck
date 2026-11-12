import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { isValidBarcode } from '../services/openFoodFacts';
import { Button } from './ui';

export function BarcodeForm({ id = 'barcode' }: { id?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\s/g, '');
    if (!isValidBarcode(clean)) {
      setError(t('home.invalidBarcode'));
      return;
    }
    navigate(`/product/${clean}`);
  };
  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{t('home.barcodeLabel')}</label>
      <div className="flex gap-2">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError('');
          }}
          placeholder={t('home.barcodePlaceholder')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-base dark:border-gray-600 dark:bg-gray-800"
        />
        <Button type="submit">{t('home.lookUp')}</Button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </form>
  );
}
