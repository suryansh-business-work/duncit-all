import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'duncit.podRent.';

const read = (podId: string): Record<string, number> => {
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY_PREFIX + podId);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0
      )
    );
  } catch {
    // Storage blocked or the value unreadable: the guest simply picks again.
    return {};
  }
};

const write = (podId: string, picks: Record<string, number>) => {
  try {
    globalThis.sessionStorage?.setItem(KEY_PREFIX + podId, JSON.stringify(picks));
  } catch {
    // Storage blocked: the picks still live for this page, they just will not survive a reload.
  }
};

/**
 * The items a guest picked to rent for one pod, carried from Pod Details to
 * checkout. Kept in session storage (a per-tab convenience: a reload keeps the
 * picks, nothing else depends on them — the server prices the booking).
 */
export function usePodRentalPicks(podId: string | null | undefined) {
  const [picks, setPicks] = useState<Record<string, number>>(() => (podId ? read(podId) : {}));

  useEffect(() => {
    setPicks(podId ? read(podId) : {});
  }, [podId]);

  const setQuantity = useCallback(
    (itemId: string, quantity: number) => {
      setPicks((current) => {
        const next = { ...current };
        if (quantity > 0) next[itemId] = Math.floor(quantity);
        else delete next[itemId];
        if (podId) write(podId, next);
        return next;
      });
    },
    [podId]
  );

  const clear = useCallback(() => {
    setPicks({});
    if (podId) write(podId, {});
  }, [podId]);

  return { picks, setQuantity, clear };
}

export type PodRentalPicks = ReturnType<typeof usePodRentalPicks>;
