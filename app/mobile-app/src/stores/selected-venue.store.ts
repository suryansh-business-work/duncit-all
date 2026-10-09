import { create } from 'zustand';
import { logs } from '@duncit/logs';

import { getSelectedVenueId, setSelectedVenueId } from '@/services/selected-venue';

type HydrationStatus = 'idle' | 'loading' | 'ready';

interface SelectedVenueState {
  /** The saved pick — possibly stale; `pickVenue` falls back past it. */
  venueId: string | null;
  status: HydrationStatus;
  /** Read the persisted pick once; later calls are no-ops. */
  hydrate: () => Promise<void>;
  /** Select + persist a venue — every Venue Studio screen then opens on it. */
  select: (venueId: string) => void;
}

/**
 * The venue every Venue Studio screen opens on — persisted via secure-store,
 * mirroring `studio-mode.store`. mWeb keeps the same pick in localStorage.
 *
 * A pick made while the saved one is still being read wins: the owner's tap is
 * newer than whatever the device remembered.
 */
export const useSelectedVenueStore = create<SelectedVenueState>((set, get) => ({
  venueId: null,
  status: 'idle',
  hydrate: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const saved = await getSelectedVenueId();
      if (get().status === 'loading') set({ venueId: saved, status: 'ready' });
    } catch (error: unknown) {
      logs.mobileApp.error('selected-venue', 'hydrate', { error });
      if (get().status === 'loading') set({ status: 'ready' });
    }
  },
  select: (venueId) => {
    set({ venueId, status: 'ready' });
    setSelectedVenueId(venueId).catch((error: unknown) => {
      logs.mobileApp.error('selected-venue', 'persist', { error });
    });
  },
}));
