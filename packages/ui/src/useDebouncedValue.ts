import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates `delayMs` ms after the
 * last change. Lets an input stay responsive while the value that drives a
 * query/filter settles, so we fire one request after typing stops.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
