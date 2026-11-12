import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { Icon } from './Icon';

/** Accessible modal built on <dialog>: focus trap, Esc to close, backdrop click closes. */
export function InfoSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="info-sheet-title"
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-0 text-gray-900 backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-2xl dark:bg-gray-900 dark:text-gray-100"
    >
      <div className="flex items-start gap-3 p-5">
        <h2 id="info-sheet-title" className="flex-1 text-lg font-bold">{title}</h2>
        <button type="button" onClick={onClose} className="-m-2 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t('common.close')}>
          <Icon name="x" />
        </button>
      </div>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 pb-6">{children}</div>
    </dialog>
  );
}
