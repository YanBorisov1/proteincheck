import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

const BTN = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 disabled:bg-gray-400',
  secondary: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
  danger: 'border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400',
} as const;

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-colors ${BTN[variant]} ${className}`}
    />
  );
}

export const linkButton = (variant: keyof typeof BTN = 'primary') =>
  `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-colors ${BTN[variant]}`;

export function Field({ label, hint, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <input
        id={id}
        {...rest}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3 text-base dark:border-gray-600 dark:bg-gray-800"
      />
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-gray-600 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 ${className}`}>{children}</div>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-bold">{children}</h1>;
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-gray-700 dark:text-gray-300">
      <span className="h-6 w-6 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
