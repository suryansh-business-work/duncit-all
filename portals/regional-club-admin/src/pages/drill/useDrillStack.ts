import { useCallback, useState } from 'react';
import type { DrillLevel } from './levels';

/**
 * The drill-down's state, held once.
 *
 * Both entry points — the canvas's Host box and the Club Admins table's row —
 * open the SAME drawer, so they share this rather than each keeping their own
 * `open`/`selected` pair. `open` starts a fresh stack; `push` goes one level
 * deeper; `pop` is Back.
 */
export function useDrillStack() {
  const [stack, setStack] = useState<DrillLevel[]>([]);
  const open = useCallback((level: DrillLevel) => setStack([level]), []);
  const push = useCallback((level: DrillLevel) => setStack((current) => [...current, level]), []);
  const pop = useCallback(() => setStack((current) => current.slice(0, -1)), []);
  const close = useCallback(() => setStack([]), []);
  return { stack, open, push, pop, close };
}
