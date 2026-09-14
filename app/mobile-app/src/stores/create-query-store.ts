import { create, type StoreApi, type UseBoundStore } from 'zustand';

export interface QueryStore<T> {
  data?: T;
  isLoading: boolean;
  error?: unknown;
  /** Fetch once; no-op if already loaded, joins the request if one is in flight. */
  fetch: () => Promise<void>;
  /** Force a fresh fetch (e.g. after the active user changes); joins one in flight. */
  refetch: () => Promise<void>;
  /** Drop cached data (e.g. on logout). */
  reset: () => void;
}

/**
 * Factory for a single-resource async store — the Zustand stand-in for a
 * React Query `useQuery`. Holds `data`/`isLoading`/`error`, dedupes in-flight
 * and already-loaded fetches, and supports refetch/reset. Keeps the per-resource
 * stores (branding, me, roles, …) DRY.
 *
 * ONE request per store at a time: a screen registers every hook's refetch
 * with pull-to-refresh, and the header, the feed and the save hearts all read
 * `me` — so without sharing the in-flight promise, one pull sent the same
 * query four times.
 */
export function createQueryStore<T>(
  fetcher: () => Promise<T>,
): UseBoundStore<StoreApi<QueryStore<T>>> {
  return create<QueryStore<T>>((set, get) => {
    let inFlight: Promise<void> | null = null;

    const load = async () => {
      set({ isLoading: true, error: undefined });
      try {
        set({ data: await fetcher(), isLoading: false });
      } catch (error) {
        set({ error, isLoading: false });
      }
    };

    const run = () => {
      if (!inFlight) {
        // Cleared only if it is still the current request: a reset in between
        // may already have started the next one.
        const current: Promise<void> = load().finally(() => {
          if (inFlight === current) inFlight = null;
        });
        inFlight = current;
      }
      return inFlight;
    };

    return {
      isLoading: false,
      fetch: async () => {
        if (get().data !== undefined) return;
        await run();
      },
      refetch: run,
      reset: () => {
        inFlight = null;
        set({ data: undefined, error: undefined, isLoading: false });
      },
    };
  });
}
