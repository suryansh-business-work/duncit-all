import { useEffect, useState } from 'react';

/** Seconds left before a code may be re-sent; restarts whenever `resetKey` changes. */
export function useCountdown(seconds: number, resetKey: unknown): number {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
  }, [seconds, resetKey]);

  useEffect(() => {
    if (left <= 0) return undefined;
    const id = globalThis.setTimeout(() => setLeft(left - 1), 1000);
    return () => globalThis.clearTimeout(id);
  }, [left]);

  return left;
}
