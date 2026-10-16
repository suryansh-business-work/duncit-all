import { useCallback } from 'react';
import { create } from 'zustand';

/**
 * The items a guest picked to rent, per pod, carried from Pod Details to
 * checkout. In memory only: losing them costs a re-pick, and the server prices
 * the booking whatever was carried. RN twin of mWeb's usePodRentalPicks.
 */
interface RentalPicksState {
  byPod: Record<string, Record<string, number>>;
  setQuantity: (podId: string, itemId: string, quantity: number) => void;
  clear: (podId: string) => void;
}

export const useRentalPicksStore = create<RentalPicksState>((set) => ({
  byPod: {},
  setQuantity: (podId, itemId, quantity) =>
    set((state) => {
      const picks = { ...(state.byPod[podId] ?? {}) };
      if (quantity > 0) picks[itemId] = Math.floor(quantity);
      else delete picks[itemId];
      return { byPod: { ...state.byPod, [podId]: picks } };
    }),
  clear: (podId) =>
    set((state) => {
      const byPod = { ...state.byPod };
      delete byPod[podId];
      return { byPod };
    }),
}));

const NO_PICKS: Record<string, number> = {};

/** One pod's picks and the setters bound to it. */
export function usePodRentalPicks(podId: string) {
  const picks = useRentalPicksStore((state) => state.byPod[podId] ?? NO_PICKS);
  const setQuantity = useRentalPicksStore((state) => state.setQuantity);
  const clear = useRentalPicksStore((state) => state.clear);
  return {
    picks,
    setQuantity: useCallback(
      (itemId: string, quantity: number) => setQuantity(podId, itemId, quantity),
      [podId, setQuantity],
    ),
    clear: useCallback(() => clear(podId), [podId, clear]),
  };
}

export type PodRentalPicks = ReturnType<typeof usePodRentalPicks>;
