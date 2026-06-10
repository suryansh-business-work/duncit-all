import { gql } from '@/generated/graphql';

/** Public client config (Google OAuth client id + Maps key) sourced from the
 * Tech portal via the server. Public + unauthenticated — needed before login. */
export const PublicClientConfigDocument = gql(`
  query MobilePublicClientConfig {
    publicClientConfig {
      google_client_id
      google_maps_api_key
    }
  }
`);
