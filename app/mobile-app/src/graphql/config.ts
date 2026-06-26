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

/** Admin-panel display formats (Settings → date/time) — drives every picker
 * and date label so formatting stays in sync with mWeb. */
export const PublicAppSettingsDocument = gql(`
  query MobilePublicAppSettings {
    publicAppSettings {
      date_format
      time_format
      time_zone
    }
  }
`);
