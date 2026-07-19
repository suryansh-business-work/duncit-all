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
      min_birth_year
      max_birth_year
      draft_retention_days
    }
  }
`);

/** Public feature flags (e.g. `is_product_visible`) seeded server-side and read
 * by every client to gate optional surfaces. Mirrors mWeb's useFeatureFlag. */
export const PublicFeatureFlagsDocument = gql(`
  query MobilePublicFeatureFlags {
    publicFeatureFlags {
      key
      enabled
    }
  }
`);

/** Public app-version info (latest published version + store URLs) used by the
 * force-update gate. Public + unauthenticated — checked on every cold start
 * before the app is usable. `latest_version` may be "" when unset. */
export const AppVersionInfoDocument = gql(`
  query MobileAppVersionInfo {
    appVersionInfo {
      latest_version
      android_store_url
      ios_store_url
    }
  }
`);
