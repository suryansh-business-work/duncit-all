import { gql } from '@apollo/client';

/** A row of the server's portal registry, as the shared table engine pages it. */
export interface PortalAppRow {
  key: string;
  name: string;
  kind: 'PORTAL' | 'WEBSITE' | 'APP';
  url?: string | null;
  chat_enabled: boolean;
  apps_enabled: boolean;
}

/** Which header feature a switch writes — the two columns of the table. */
export type PortalAppFeature = 'chat_enabled' | 'apps_enabled';

/**
 * The same registry-backed page the Tech console's Maintenance table reads;
 * this one just draws different columns off it, so the portal list has one
 * source of truth rather than two that can disagree.
 */
export const PORTAL_APP_TABLE = gql`
  query PortalAppSettingsTable($query: TableQueryInput) {
    portalModesTable(query: $query) {
      rows {
        key
        name
        kind
        url
        chat_enabled
        apps_enabled
      }
      total
      page
      page_size
    }
  }
`;

/** Each flag is optional server-side, so one switch is sent per request. */
export const SET_PORTAL_APP_FEATURES = gql`
  mutation SetPortalAppFeatures($key: String!, $chat_enabled: Boolean, $apps_enabled: Boolean) {
    setPortalAppFeatures(key: $key, chat_enabled: $chat_enabled, apps_enabled: $apps_enabled) {
      key
      chat_enabled
      apps_enabled
    }
  }
`;
