import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

/**
 * The Remotion licence Reel Studio renders under.
 *
 * Remotion is free for individuals and for companies of up to three people;
 * anyone larger needs a Company Licence, and the key that comes with it is what
 * the exporter reports its renders against. It belongs to the deployment, not
 * to whoever is signed in, so it lives in Tech → Environment → Remotion and the
 * server hands it out in `publicClientConfig` (Remotion takes the key in client
 * code, so it is public by design). Changing it needs no rebuild.
 *
 * Unset is a legitimate state — the studio still previews and exports — but
 * Remotion then prints its licence notice in the console, which is the prompt
 * to go and get one.
 */
export const REMOTION_LICENSE = gql`
  query MarketingRemotionLicense {
    publicClientConfig {
      remotion_license_key
    }
  }
`;

/** The licence key, or null until it arrives and when none is configured. */
export function useRemotionLicenseKey(): string | null {
  const { data } = useQuery<{ publicClientConfig?: { remotion_license_key?: string | null } }>(REMOTION_LICENSE, {
    fetchPolicy: 'cache-first',
  });
  const key = data?.publicClientConfig?.remotion_license_key?.trim() ?? '';
  return key === '' ? null : key;
}
