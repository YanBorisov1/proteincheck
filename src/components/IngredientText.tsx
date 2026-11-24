import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { highlightIngredients, type HighlightKind, type Segment } from '../analysis/highlight';
import { useI18n } from '../i18n/I18nProvider';
import { InfoSheet } from './InfoSheet';
import { useTermInfo } from './TermInfo';

/** Text-colour + underline styles meeting AA contrast on white and on dark backgrounds. */
export const KIND_STYLES: Record<HighlightKind, string> = {
  protein: 'bg-green-100 text-green-900 decoration-green-700 dark:bg-green-950 dark:text-green-200',
  proteinIncomplete: 'bg-yellow-100 text-yellow-900 decoration-yellow-700 dark:bg-yellow-950 dark:text-yellow-200',
  spiking: 'bg-red-100 text-red-900 decoration-red-700 dark:bg-red-950 dark:text-red-200',
  sugar: 'bg-orange-100 text-orange-900 decoration-orange-700 dark:bg-orange-950 dark:text-orange-200',
  polyol: 'bg-amber-100 text-amber-900 decoration-amber-700 dark:bg-amber-950 dark:text-amber-200',
  sweetener: 'bg-purple-100 text-purple-900 decoration-purple-700 dark:bg-purple-950 dark:text-purple-200',
  filler: 'bg-orange-100 text-orange-900 decoration-orange-700 dark:bg-orange-950 dark:text-orange-200',
  fiber: 'bg-yellow-100 text-yellow-900 decoration-yellow-700 dark:bg-yellow-950 dark:text-yellow-200',
  fat: 'bg-red-100 text-red-900 decoration-red-700 dark:bg-red-950 dark:text-red-200',
  blend: 'bg-amber-100 text-amber-900 decoration-amber-700 dark:bg-amber-950 dark:text-amber-200',
  additive: 'bg-sky-100 text-sky-900 decoration-sky-700 dark:bg-sky-950 dark:text-sky-200',
};

const ADDITIVE_CONCERN_STYLE = {
  none: 'bg-gray-100 text-gray-900 decoration-gray-600 dark:bg-gray-800 dark:text-gray-100',
  limited: KIND_STYLES.additive,
  moderate: 'bg-orange-100 text-orange-900 decoration-orange-700 dark:bg-orange-950 dark:text-orange-200',
  high: 'bg-red-100 text-red-900 decoration-red-700 dark:bg-red-950 dark:text-red-200',
} as const;

function styleFor(seg: Segment): string {
  if (!seg.kind) return '';
  if (seg.kind === 'additive' && seg.concern) return ADDITIVE_CONCERN_STYLE[seg.concern];
  return KIND_STYLES[seg.kind];
}

export function IngredientText({ text, clampLines }: { text: string; /** Collapse to about this many lines with a "show all" toggle. */ clampLines?: number }) {
  const { t } = useI18n();
  const segments = useMemo(() => highlightIngredients(text), [text]);
  const [active, setActive] = useState<{ ref: string; text: string } | null>(null);
  const info = useTermInfo(active?.ref ?? null, active?.text ?? '');
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || !clampLines || expanded) return;
    setOverflows(el.scrollHeight > el.clientHeight + 4);
  }, [text, clampLines, expanded]);
  const clamped = Boolean(clampLines) && !expanded;
  const kinds = useMemo(() => [...new Set(segments.map((s) => s.kind).filter((k): k is HighlightKind => Boolean(k)))], [segments]);

  return (
    <div>
      <p
        ref={textRef}
        id="ingredient-text"
        className="leading-8"
        style={clamped ? { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: clampLines, overflow: 'hidden' } : undefined}
      >
        {segments.map((seg, i) =>
          seg.kind && seg.ref ? (
            <button
              key={i}
              type="button"
              onClick={() => setActive({ ref: seg.ref ?? '', text: seg.text })}
              className={`rounded px-0.5 py-1 underline decoration-2 underline-offset-2 ${styleFor(seg)}`}
              aria-label={`${seg.text}: ${t(`legend.${seg.kind}`)}`}
            >
              {seg.text}
            </button>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>
      {clampLines && (overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="ingredient-text"
          className="mt-1 min-h-[44px] font-semibold text-brand-700 underline dark:text-brand-100"
        >
          {expanded ? t('quick.ingredients.less') : t('quick.ingredients.all')}
        </button>
      )}
      {kinds.length > 0 && (
        <div className="mt-3">
          <h3 className="sr-only">{t('results.legend')}</h3>
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {kinds.map((k) => (
              <li key={k} className={`rounded-full px-2 py-0.5 ${KIND_STYLES[k]}`}>{t(`legend.${k}`)}</li>
            ))}
          </ul>
        </div>
      )}
      <InfoSheet open={active !== null} title={info.title} onClose={() => setActive(null)}>
        {info.body}
      </InfoSheet>
    </div>
  );
}
