import { useEffect, useState } from 'react';
import type { AnalysisResult } from '../../analysis';
import { DataRow, Section } from '../../components/Section';
import { Field } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { SavedProduct } from '../../services/db';
import { useSettings } from '../../state/settings';
import { formatGrams, formatMoney, parseNumberInput } from '../../utils/format';

export function ValueSection({ r, saved, onPatch }: {
  r: AnalysisResult;
  saved: SavedProduct;
  onPatch: (p: { price?: number | undefined; packageSizeG?: number | undefined }) => Promise<void>;
}) {
  const { t, n, locale } = useI18n();
  const { settings } = useSettings();
  const [price, setPrice] = useState(saved.price?.toString() ?? '');
  const [size, setSize] = useState((saved.packageSizeG ?? r.product.packageSizeG)?.toString() ?? '');
  useEffect(() => setPrice(saved.price?.toString() ?? ''), [saved.price]);

  const commit = () => {
    const p = parseNumberInput(price);
    const s = parseNumberInput(size);
    const patch: { price?: number | undefined; packageSizeG?: number | undefined } = { price: p && p > 0 ? p : undefined };
    if (s !== r.product.packageSizeG) patch.packageSizeG = s && s > 0 ? s : undefined;
    void onPatch(patch);
  };
  const v = r.value;
  return (
    <Section title={t('section.value')} summary={v.costPer30gProtein !== undefined ? `${formatMoney(v.costPer30gProtein, settings.currency, locale)} / 30 g` : t('value.hint')}>
      <div className="grid grid-cols-2 gap-3">
        <Field id="price" label={`${t('value.price')} (${settings.currency})`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={commit} />
        <Field id="package" label={t('value.packageSize')} inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} onBlur={commit} />
      </div>
      {v.price !== undefined && v.packageSizeG === undefined && <p className="text-sm">{t('value.needSize')}</p>}
      <dl>
        <DataRow label={t('value.costPer30')} value={formatMoney(v.costPer30gProtein, settings.currency, locale)} />
        <DataRow label={t('value.costPer100')} value={formatMoney(v.costPer100g, settings.currency, locale)} />
        <DataRow label={t('value.proteinPerPack')} value={formatGrams(v.proteinPerPackG, n, 0)} />
      </dl>
    </Section>
  );
}
