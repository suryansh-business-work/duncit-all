import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stopped changing for `delayMs`. Used to debounce
 * search inputs so the server query fires once per pause instead of per
 * keystroke — the input itself stays instant.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
