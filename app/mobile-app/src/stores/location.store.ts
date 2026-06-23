import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { LocationsDocument, SetSelectedLocationDocument } from '@/graphql/location';
import { graphqlRequest } from '@/services/graphql.client';

export type LocationsData = ResultOf<typeof LocationsDocument>;
export type LocationItem = LocationsData['locations'][number];

// Best-effort persist of the user's selected location. Promise-safe so it never
// throws on a non-promise (e.g. a mocked client) and never breaks the UI on a
// network error — the local selection is the source of truth for the session.
const persistSelection = (locationId: string) => {
  Promise.resolve()
    .then(() => graphqlRequest(SetSelectedLocationDocument, { locationId }, { auth: true }))
    .catch(() => undefined);
};

interface LocationState {
  data?: LocationsData;
  isLoading: boolean;
  error?: unknown;
  selectedId: string;
  zoneName: string;
  cityLabel: string;
  countryCode: string;
  countryName: string;
  fetch: () => Promise<void>;
  /** Set the active location. `persist` (default true) saves it to the server;
   *  hydration replays a saved choice with `persist=false` to avoid a re-save. */
  select: (location: LocationItem, zoneName?: string, persist?: boolean) => void;
  /** Apply the user's saved location once on load, if nothing is selected yet. */
  hydrateFromUser: (locationId: string | null | undefined) => void;
  clear: () => void;
}

/** Active locations + the user's selected city/zone (shared across the app). */
export const useLocationStore = create<LocationState>((set, get) => ({
  isLoading: false,
  selectedId: '',
  zoneName: '',
  cityLabel: '',
  countryCode: '',
  countryName: '',
  select: (location, zoneName = '', persist = true) => {
    set({
      selectedId: location.id,
      cityLabel: location.city || location.location_name,
      countryCode: location.country_code ?? '',
      countryName: location.country ?? '',
      zoneName,
    });
    if (persist) persistSelection(location.id);
  },
  hydrateFromUser: (locationId) => {
    const { selectedId, data } = get();
    if (selectedId || !locationId || !data) return;
    const loc = data.locations.find((l) => l.id === locationId);
    if (loc) get().select(loc, '', false);
  },
  clear: () =>
    set({ selectedId: '', zoneName: '', cityLabel: '', countryCode: '', countryName: '' }),
  fetch: async () => {
    if (get().isLoading || get().data) return;
    set({ isLoading: true, error: undefined });
    try {
      const data = await graphqlRequest(LocationsDocument, undefined, { auth: true });
      set({ data, isLoading: false });
    } catch (error) {
      set({ error, isLoading: false });
    }
  },
}));
