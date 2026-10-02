import { gql } from '@apollo/client';

export type ClubSlotRequestStatus = 'OPEN' | 'RESOLVED';

export interface ClubSlotRequestRow {
  id: string;
  club_id: string;
  club_name: string;
  host_name: string;
  host_contact: string;
  notified: number;
  status: ClubSlotRequestStatus;
  created_at: string;
}

export const CLUB_SLOT_REQUESTS_TABLE = gql`
  query ClubSlotRequestsTable($query: TableQueryInput) {
    clubSlotRequestsTable(query: $query) {
      total
      rows {
        id
        club_id
        club_name
        host_name
        host_contact
        notified
        status
        created_at
      }
    }
  }
`;

export const RESOLVE_CLUB_SLOT_REQUEST = gql`
  mutation ResolveClubSlotRequest($id: ID!) {
    resolveClubSlotRequest(id: $id) {
      id
      status
    }
  }
`;
