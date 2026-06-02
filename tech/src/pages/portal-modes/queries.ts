import { gql } from '@apollo/client';

export const PORTAL_MODES = gql`
  query PortalModes {
    portalModes {
      id
      key
      name
      kind
      mode
      note
      url
      updated_at
    }
  }
`;

export const SET_PORTAL_MODE = gql`
  mutation SetPortalMode($key: String!, $mode: PortalModeState!, $note: String) {
    setPortalMode(key: $key, mode: $mode, note: $note) {
      id
      key
      mode
      updated_at
    }
  }
`;

export type PortalModeState = 'LIVE' | 'MAINTENANCE' | 'DEVELOPMENT';
export type PortalModeKind = 'PORTAL' | 'WEBSITE' | 'APP';

export interface PortalModeRow {
  id: string;
  key: string;
  name: string;
  kind: PortalModeKind;
  mode: PortalModeState;
  note: string | null;
  url: string | null;
  updated_at: string | null;
}
