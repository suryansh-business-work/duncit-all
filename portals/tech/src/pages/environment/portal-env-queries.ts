import { gql } from '@apollo/client';

export const SET_PORTAL_ENV_ENTRIES = gql`
  mutation SetPortalEnvEntries($portalKey: String!, $entryIds: [ID!]!) {
    setPortalEnvEntries(portalKey: $portalKey, entryIds: $entryIds) { id }
  }
`;

/** Portal list — reuse the maintenance/portalMode listing (same registry). */
export const PORTAL_LIST = gql`
  query PortalListForEnv {
    portalModes { key name kind }
  }
`;

/** Server-paged portal registry for the Portal Mapping table (same registry). */
export const PORTAL_MODES_TABLE_FOR_ENV = gql`
  query PortalModesTableForEnv($query: TableQueryInput) {
    portalModesTable(query: $query) {
      total
      rows { key name kind }
    }
  }
`;

export interface PortalListItem {
  key: string;
  name: string;
  kind: 'PORTAL' | 'WEBSITE' | 'APP';
}
