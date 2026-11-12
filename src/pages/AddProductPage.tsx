import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { parseIngredientsFromOcr, parseNutritionText } from '../analysis/labelParser';
import type { Nutriments, Product } from '../analysis/types';
import { Icon } from '../components/Icon';
import { Button, Card, Field, PageTitle } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { getSaved, saveProduct } from '../services/db';
import { isValidBarcode } from '../services/openFoodFacts';
import { useSettings } from '../state/settings';
import { parseNumberInput } from '../utils/format';

type NutKey = keyof Nutriments;

const NUTRIENT_FIELDS: Array<{ key: NutKey; label: Parameters<ReturnType<typeof useI18n>['t']>[0] }> = [
  { key: 'energyKcal100g', label: 'add.energy' },
  { key: 'proteins100g', label: 'add.protein' },
  { key: 'carbohydrates100g', label: 'add.carbs' },
  { key: 'sugars100g', label: 'add.sugars' },
  { key: 'polyols100g', label: 'add.polyols' },
  { key: 'fat100g', label: 'add.fat' },
  { key: 'saturatedFat100g', label: 'add.satFat' },
  { key: 'fiber100g', label: 'add.fiber' },
  { key: 'salt100g', label: 'add.salt' },
];

interface FormState {
  name: string;
  brand: string;
  barcode: string;
  serving: string;
  pkg: string;
  ingredients: string;
  claims: string;
  nutr: Partial<Record<NutKey, string>>;
}

const EMPTY: FormState = { name: '', brand: '', barcode: '', serving: '', pkg: '', ingredients: '', claims: '', nutr: {} };

function fromProduct(p: Product): FormState {
  const nutr: FormState['nutr'] = {};
  for (const [k, v] of Object.entries(p.nutriments)) if (typeof v === 'number') nutr[k as NutKey] = String(v);
  return {
    name: p.name,
    brand: p.brand ?? '',
    barcode: p.barcode ?? '',
    serving: p.servingSizeG?.toString() ?? '',
    pkg: p.packageSizeG?.toString() ?? '',
    ingredients: p.ingredientsText,
    claims: p.labels.filter((l) => !l.includes(':')).join(', '),
    nutr,
  };
}

type OcrState = { status: 'idle' } | { status: 'running'; pct: number } | { status: 'done'; found: string } | { status: 'error' };

function PhotoInput({ id, label, state, onFile }: { id: string; label: string; state: OcrState; onFile: (f: File) => void }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-3 dark:border-gray-600">
      <p className="mb-2 font-medium">{label}</p>
      <label htmlFor={id} className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800">
        <Icon name="camera" className="h-5 w-5" /> {t('add.choosePhoto')}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <p className="mt-2 text-sm" role="status" aria-live="polite">
        {state.status === 'running' && t('add.reading', { pct: state.pct })}
        {state.status === 'done' && (state.found ? t('add.readFound', { fields: state.found }) : t('add.ocrDone'))}
        {state.status === 'error' && <span className="text-red-700 dark:text-red-400">{t('add.ocrFailed')}</span>}
      </p>
    </div>
  );
}

export default function AddProductPage() {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const [mode, setMode] = useState<'photo' | 'manual'>(params.get('mode') === 'manual' || editId ? 'manual' : 'photo');
  const [form, setForm] = useState<FormState>({ ...EMPTY, barcode: params.get('barcode') ?? '' });
  const [ingOcr, setIngOcr] = useState<OcrState>({ status: 'idle' });
  const [nutOcr, setNutOcr] = useState<OcrState>({ status: 'idle' });
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    if (!editId) return;
    void getSaved(editId).then((s) => {
      if (s) {
        setEditing(s.product);
        setForm(fromProduct(s.product));
      }
    });
  }, [editId]);

  const runOcr = async (file: File, kind: 'ingredients' | 'nutrition') => {
    const set = kind === 'ingredients' ? setIngOcr : setNutOcr;
    set({ status: 'running', pct: 0 });
    try {
      const { recognizeLabel } = await import('../services/ocr');
      const text = await recognizeLabel(file, settings.language, (status, p) => {
        if (status.startsWith('recognizing')) set({ status: 'running', pct: Math.round(p * 100) });
      });
      if (kind === 'ingredients') {
        const ingredients = parseIngredientsFromOcr(text);
        setForm((f) => ({ ...f, ingredients }));
        set({ status: 'done', found: '' });
      } else {
        const parsed = parseNutritionText(text);
        setForm((f) => {
          const nutr = { ...f.nutr };
          for (const [k, v] of Object.entries(parsed.nutriments)) if (typeof v === 'number') nutr[k as NutKey] = String(v);
          return { ...f, nutr, serving: parsed.servingSizeG?.toString() ?? f.serving };
        });
        set({ status: 'done', found: parsed.found.length ? `${parsed.found.length} / ${NUTRIENT_FIELDS.length + 1}` : '' });
      }
    } catch {
      set({ status: 'error' });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const protein = parseNumberInput(form.nutr.proteins100g ?? '');
    if (!form.name.trim() || protein === undefined) {
      setError(t('add.required'));
      return;
    }
    const nutriments: Nutriments = {};
    for (const { key } of NUTRIENT_FIELDS) {
      const v = parseNumberInput(form.nutr[key] ?? '');
      if (v !== undefined) nutriments[key] = v;
    }
    const barcode = form.barcode.replace(/\s/g, '');
    const claims = form.claims.split(',').map((s) => s.trim()).filter(Boolean);
    const product: Product = {
      ...(editing ?? {}),
      id: editing?.id ?? (isValidBarcode(barcode) ? barcode : `local-${Date.now()}`),
      name: form.name.trim(),
      ingredientsText: form.ingredients.trim(),
      nutriments,
      allergenTags: editing?.allergenTags ?? [],
      tracesTags: editing?.tracesTags ?? [],
      labels: [...(editing?.labels.filter((l) => l.includes(':')) ?? []), ...claims],
      categories: editing?.categories ?? [],
      analysisTags: editing?.analysisTags ?? [],
      source: editing?.source === 'off' ? 'off' : mode === 'photo' ? 'ocr' : 'manual',
      fetchedAt: editing?.fetchedAt ?? Date.now(),
    };
    if (form.brand.trim()) product.brand = form.brand.trim();
    else delete product.brand;
    if (isValidBarcode(barcode)) product.barcode = barcode;
    const serving = parseNumberInput(form.serving);
    if (serving) product.servingSizeG = serving;
    else delete product.servingSizeG;
    const pkg = parseNumberInput(form.pkg);
    if (pkg) product.packageSizeG = pkg;
    else delete product.packageSizeG;
    await saveProduct(product);
    navigate(`/product/${encodeURIComponent(product.id)}`, { replace: true });
  };

  const tab = (m: 'photo' | 'manual', label: string, icon: 'camera' | 'edit') => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg font-semibold ${mode === m ? 'bg-white shadow dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
    >
      <Icon name={icon} className="h-5 w-5" /> {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <PageTitle>{t('add.title')}</PageTitle>
      {!editing && (
        <div role="tablist" className="flex gap-1 rounded-xl bg-gray-200 p-1 dark:bg-gray-800">
          {tab('photo', t('add.tabPhoto'), 'camera')}
          {tab('manual', t('add.tabManual'), 'edit')}
        </div>
      )}

      {mode === 'photo' && !editing && (
        <Card className="space-y-3">
          <p>{t('add.photoIntro')}</p>
          <PhotoInput id="photo-ingredients" label={t('add.photoIngredients')} state={ingOcr} onFile={(f) => void runOcr(f, 'ingredients')} />
          <PhotoInput id="photo-nutrition" label={t('add.photoNutrition')} state={nutOcr} onFile={(f) => void runOcr(f, 'nutrition')} />
          <p className="text-xs text-gray-600 dark:text-gray-400">{t('add.ocrFirstRun')}</p>
        </Card>
      )}

      <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate lang={locale}>
        {mode === 'photo' && !editing && <h2 className="text-lg font-semibold">{t('add.reviewTitle')}</h2>}
        <Card className="space-y-3">
          <Field id="f-name" label={t('add.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Field id="f-brand" label={t('add.brand')} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            <Field id="f-barcode" label={t('add.barcode')} inputMode="numeric" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} disabled={Boolean(editing)} />
            <Field id="f-serving" label={t('add.serving')} inputMode="decimal" value={form.serving} onChange={(e) => setForm({ ...form, serving: e.target.value })} />
            <Field id="f-pkg" label={t('add.package')} inputMode="decimal" value={form.pkg} onChange={(e) => setForm({ ...form, pkg: e.target.value })} />
          </div>
          <div>
            <label htmlFor="f-ingredients" className="mb-1 block text-sm font-medium">{t('add.ingredients')}</label>
            <textarea
              id="f-ingredients"
              rows={5}
              value={form.ingredients}
              onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
              aria-describedby="f-ingredients-hint"
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base dark:border-gray-600 dark:bg-gray-800"
            />
            <p id="f-ingredients-hint" className="mt-1 text-xs text-gray-600 dark:text-gray-400">{t('add.ingredientsHint')}</p>
          </div>
          <Field id="f-claims" label={t('add.claims')} value={form.claims} onChange={(e) => setForm({ ...form, claims: e.target.value })} />
        </Card>
        <Card>
          <fieldset>
            <legend className="mb-2 font-semibold">{t('add.nutritionPer100')}</legend>
            <div className="grid grid-cols-2 gap-3">
              {NUTRIENT_FIELDS.map(({ key, label }) => (
                <Field
                  key={key}
                  id={`f-${key}`}
                  label={t(label)}
                  inputMode="decimal"
                  value={form.nutr[key] ?? ''}
                  onChange={(e) => setForm({ ...form, nutr: { ...form.nutr, [key]: e.target.value } })}
                />
              ))}
            </div>
          </fieldset>
        </Card>
        {error && <p role="alert" className="text-red-700 dark:text-red-400">{error}</p>}
        <Button type="submit" className="w-full text-lg">{t('add.analyze')}</Button>
      </form>
    </div>
  );
}
