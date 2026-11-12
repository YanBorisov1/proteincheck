import { useCallback, useEffect, useState } from 'react';
import { safeStorage } from '../utils/storage';

const KEY = 'proteincheck.compare';
export const MAX_COMPARE = 4;
const EVENT = 'proteincheck:compare';

function read(): string[] {
  try {
    const v = JSON.parse(safeStorage.get(KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

/** Compare selection shared across screens (kept in localStorage). */
export function useCompareList() {
  const [ids, setIds] = useState<string[]>(read);
  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const write = useCallback((next: string[]) => {
    safeStorage.set(KEY, JSON.stringify(next.slice(0, MAX_COMPARE)));
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const toggle = useCallback(
    (id: string) => {
      const cur = read();
      if (cur.includes(id)) write(cur.filter((x) => x !== id));
      else if (cur.length < MAX_COMPARE) write([...cur, id]);
    },
    [write],
  );
  const clear = useCallback(() => write([]), [write]);
  return { ids, toggle, clear, set: write };
}
