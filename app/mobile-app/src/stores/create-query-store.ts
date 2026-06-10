import { create, type StoreApi, type UseBoundStore } from 'zustand';

export interface QueryStore<T> {
  data?: T;
  isLoading: boolean;
  error?: unknown;
  /** Fetch once; no-op if already loaded or in flight. */
  fetch: () => Promise<void>;
  /** Force a fresh fetch (e.g. after the active user changes). */
  refetch: () => Promise<void>;
  /** Drop cached data (e.g. on logout). */
  reset: () => void;
}

/**
 * Factory for a single-resource async store — the Zustand stand-in for a
 * React Query `useQuery`. Holds `data`/`isLoading`/`error`, dedupes in-flight
 * and already-loaded fetches, and supports refetch/reset. Keeps the per-resource
 * stores (branding, me, roles, …) DRY.
 */
export function createQueryStore<T>(
  fetcher: () => Promise<T>,
): UseBoundStore<StoreApi<QueryStore<T>>> {
  return create<QueryStore<T>>((set, get) => {
    const run = async () => {
      set({ isLoading: true, error: undefined });
      try {
        set({ data: await fetcher(), isLoading: false });
      } catch (error) {
        set({ error, isLoading: false });
      }
    };
    return {
      isLoading: false,
      fetch: async () => {
        if (get().isLoading || get().data !== undefined) return;
        await run();
      },
      refetch: run,
      reset: () => set({ data: undefined, error: undefined, isLoading: false }),
    };
  });
}
