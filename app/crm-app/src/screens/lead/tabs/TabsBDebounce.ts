import { useEffect, useState } from 'react';

import { SEARCH_DEBOUNCE_MS } from '@/hooks/usePagedSearch';

/** The value once typing has paused — a search box asks the server once, not on every key. */
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
