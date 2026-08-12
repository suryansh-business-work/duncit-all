import { gql, useQuery } from '@apollo/client';

/** Which header features this console offers, per Admin > Portal App Settings. */
export interface PortalAppFeatures {
  chat: boolean;
  apps: boolean;
}

const PORTAL_APP_FEATURES = gql`
  query PortalAppFeatures($key: String!) {
    portalMode(key: $key) {
      key
      chat_enabled
      apps_enabled
    }
  }
`;

/** Everything on, which is how every console behaved before the setting existed. */
const ALL_ON: PortalAppFeatures = { chat: true, apps: true };

/**
 * Reads this portal's header features from the server.
 *
 * **Fails open**, for the same reason PortalModeGate does: a server blip or a
 * portal that predates its registry row must not silently strip the header of
 * the chat and apps buttons — an absent answer means "unchanged", not "off".
 * The query is public, so it resolves before the user does and the buttons
 * never flash in and back out.
 */
export function usePortalAppFeatures(portalKey?: string): PortalAppFeatures {
  const { data } = useQuery(PORTAL_APP_FEATURES, {
    variables: { key: portalKey },
    skip: !portalKey,
    fetchPolicy: 'cache-first',
  });
  const mode = data?.portalMode;
  if (!mode) return ALL_ON;
  return { chat: mode.chat_enabled !== false, apps: mode.apps_enabled !== false };
}
