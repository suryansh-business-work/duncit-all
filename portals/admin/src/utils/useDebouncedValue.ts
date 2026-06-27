import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates `delay` ms after the
 * last change. Lets an input stay responsive while the value that drives a
 * query/filter settles, so we fire one request after typing stops (B26).
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
