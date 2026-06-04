import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { LocationsDocument } from '@/graphql/location';
import { graphqlRequest } from '@/services/graphql.client';

export type LocationsData = ResultOf<typeof LocationsDocument>;
export type LocationItem = LocationsData['locations'][number];

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
  select: (location: LocationItem, zoneName?: string) => void;
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
  select: (location, zoneName = '') =>
    set({
      selectedId: location.id,
      cityLabel: location.city || location.location_name,
      countryCode: location.country_code ?? '',
      countryName: location.country ?? '',
      zoneName,
    }),
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
