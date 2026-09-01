import { gql, type ApolloClient } from '@apollo/client';

/**
 * The Google OAuth client id every console signs in with, resolved at RUNTIME.
 *
 * The server's `publicClientConfig` reads it from the Tech portal's env store
 * (the GOOGLE_OAUTH category), so rotating the credential is a Tech-portal edit
 * — not a rebuild of 17 portal images. mWeb and the native app already boot this
 * way; this is the one place the portals do it (rule 40), called by
 * `mountPortal` before it renders.
 */
const PUBLIC_CLIENT_CONFIG = gql`
  query PortalPublicClientConfig {
    publicClientConfig {
      google_client_id
    }
  }
`;

/** Cap on how long boot waits for the config before painting without it. */
const CONFIG_TIMEOUT_MS = 3000;

let clientId = '';

/**
 * The resolved client id. Empty until `loadGoogleClientId` settles — and empty
 * for good when the Tech portal has none configured, which is what makes the
 * sign-in button render its "not configured" state instead of a dead provider.
 */
export const getGoogleClientId = (): string => clientId;

/** Set the client id directly (used by boot and by tests). Blank input clears it. */
export const setGoogleClientId = (next: string | null | undefined): void => {
  clientId = next?.trim() ?? '';
};

/** Query the server for the runtime id; resolves to '' on any failure. */
async function fetchGoogleClientId(apolloClient: ApolloClient): Promise<string> {
  try {
    const { data } = await apolloClient.query<{ publicClientConfig?: { google_client_id?: string | null } }>({
      query: PUBLIC_CLIENT_CONFIG,
      fetchPolicy: 'network-only',
    });
    return data?.publicClientConfig?.google_client_id ?? '';
  } catch {
    return '';
  }
}

/**
 * Resolve and store the client id for this session. The runtime value wins;
 * `fallback` (the optional `googleClientId` mount option) applies only when the
 * server has nothing. Never rejects, and never blocks first paint for longer
 * than `CONFIG_TIMEOUT_MS`.
 */
export async function loadGoogleClientId(apolloClient: ApolloClient, fallback = ''): Promise<string> {
  const timedOut = new Promise<string>((resolve) => {
    globalThis.setTimeout(() => resolve(''), CONFIG_TIMEOUT_MS);
  });
  const resolved = await Promise.race([fetchGoogleClientId(apolloClient), timedOut]);
  setGoogleClientId(resolved || fallback);
  return getGoogleClientId();
}
