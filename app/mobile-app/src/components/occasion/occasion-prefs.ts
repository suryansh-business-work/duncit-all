import { useCallback, useEffect, useState } from 'react';
import { logs } from '@duncit/logs';

import { getItem, removeItem, setItem } from '@/services/secure-storage';

const PAUSE_KEY = 'duncit.occasion.paused';

/** Looks already greeted since launch. Memory only: the next launch greets again, once. */
const greeted = new Set<string>();

export const wasGreeted = (lookKey: string): boolean => greeted.has(lookKey);

export function markGreeted(lookKey: string): void {
  greeted.add(lookKey);
}

/**
 * Whether the viewer paused this look's animation — remembered per look
 * across launches, so a new festival starts moving again. Null until the
 * stored choice is read. Storage that fails is logged and the choice then
 * lasts this launch only.
 */
export function useOccasionPaused(lookKey: string): { paused: boolean | null; toggle: () => void } {
  const [paused, setPaused] = useState<boolean | null>(null);
  const storageKey = `${PAUSE_KEY}.${lookKey}`;

  useEffect(() => {
    getItem(storageKey).then(
      (value) => setPaused(value === '1'),
      (error: unknown) => {
        logs.mobileApp.warn('occasion', 'readPaused', { error });
        setPaused(false);
      },
    );
  }, [storageKey]);

  const toggle = useCallback(() => {
    const next = paused !== true;
    setPaused(next);
    const saved = next ? setItem(storageKey, '1') : removeItem(storageKey);
    saved.catch((error: unknown) => logs.mobileApp.warn('occasion', 'savePaused', { error }));
  }, [paused, storageKey]);

  return { paused, toggle };
}
