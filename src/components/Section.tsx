import type { ReactNode } from 'react';
import type { Severity } from '../analysis/types';

const DOT: Record<Severity, string> = {
  bad: 'bg-red-600',
  warn: 'bg-orange-500',
  good: 'bg-green-600',
  info: 'bg-gray-400',
};

/** Expandable section built on <details> (keyboard and screen-reader friendly by default). */
export function Section({ title, status, summary, children, defaultOpen = false, id }: {
  title: string;
  status?: Severity;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
}) {
  return (
    <details id={id} open={defaultOpen} className="group rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        {status && <span className={`h-3 w-3 shrink-0 rounded-full ${DOT[status]}`} aria-hidden="true" />}
        <span className="flex-1">
          <span className="block font-semibold">{title}</span>
          {summary && <span className="block text-sm text-gray-600 dark:text-gray-400">{summary}</span>}
        </span>
        <span className="text-gray-500 transition-transform group-open:rotate-90" aria-hidden="true">›</span>
      </summary>
      <div className="space-y-3 border-t border-gray-100 px-4 py-3 text-[15px] dark:border-gray-800">{children}</div>
    </details>
  );
}

export function DataRow({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-1.5 last:border-0 dark:border-gray-800">
      <dt className="text-gray-700 dark:text-gray-300">
        {label}
        {note && <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{note}</span>}
      </dt>
      <dd className="text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function Explain({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{children}</p>;
}
