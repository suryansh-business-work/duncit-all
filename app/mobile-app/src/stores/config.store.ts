import { create } from 'zustand';

import { config } from '@/constants/config';
import { PublicClientConfigDocument } from '@/graphql/config';
import { graphqlRequest } from '@/services/graphql.client';

interface ConfigState {
  googleClientId: string;
  googleMapApiKey: string;
  load: () => Promise<void>;
}

/**
 * Runtime client config. Initialised from the bundled env (local-dev / offline
 * fallback) and overridden at startup by the server's `publicClientConfig`,
 * which sources the values from the Tech portal — so nothing is hardcoded.
 * Reactive, so the Google button and maps update once the server value arrives.
 */
export const useConfigStore = create<ConfigState>((set) => ({
  googleClientId: config.googleClientId,
  googleMapApiKey: config.googleMapApiKey,
  load: async () => {
    try {
      const data = await graphqlRequest(PublicClientConfigDocument);
      const c = data.publicClientConfig;
      set((prev) => ({
        googleClientId: c.google_client_id?.trim() || prev.googleClientId,
        googleMapApiKey: c.google_maps_api_key?.trim() || prev.googleMapApiKey,
      }));
    } catch {
      // Server unreachable — keep the env fallback.
    }
  },
}));
