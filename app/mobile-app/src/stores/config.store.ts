import { create } from 'zustand';

import { config } from '@/constants/config';
import { PublicClientConfigDocument } from '@/graphql/config';
import { graphqlRequest } from '@/services/graphql.client';

interface ConfigState {
  googleClientId: string;
  googleMapApiKey: string;
  /** Sign in with Apple on iOS — the App ID. Blank: no Apple button there. */
  appleBundleId: string;
  /** Sign in with Apple's web flow (Android, web) — the Services ID. Blank: no Apple button there. */
  appleServicesId: string;
  /** Where Apple posts the web flow's answer: <server>/apple/callback. */
  appleRelayUrl: string;
  load: () => Promise<void>;
}

/**
 * Runtime client config. Initialised from the bundled env (local-dev / offline
 * fallback) and overridden at startup by the server's `publicClientConfig`,
 * which sources the values from the Tech portal — so nothing is hardcoded.
 * Reactive, so the Google and Apple buttons and maps update once the server
 * value arrives. Apple has no bundled fallback: it is offered only once the
 * Tech portal holds its identifiers.
 */
export const useConfigStore = create<ConfigState>((set) => ({
  googleClientId: config.googleClientId,
  googleMapApiKey: config.googleMapApiKey,
  appleBundleId: '',
  appleServicesId: '',
  appleRelayUrl: '',
  load: async () => {
    try {
      const data = await graphqlRequest(PublicClientConfigDocument);
      const c = data.publicClientConfig;
      set((prev) => ({
        googleClientId: c.google_client_id?.trim() || prev.googleClientId,
        googleMapApiKey: c.google_maps_api_key?.trim() || prev.googleMapApiKey,
        appleBundleId: c.apple_bundle_id?.trim() || prev.appleBundleId,
        appleServicesId: c.apple_services_id?.trim() || prev.appleServicesId,
        appleRelayUrl: c.apple_relay_url?.trim() || prev.appleRelayUrl,
      }));
    } catch {
      // Server unreachable — keep the env fallback.
    }
  },
}));
