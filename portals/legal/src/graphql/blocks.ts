import { gql } from '@apollo/client';

/** One member blocking another, as the Blocked accounts table shows it. */
export interface UserBlockRow {
  id: string;
  blocker_id: string;
  blocker_name: string;
  blocked_id: string;
  blocked_name: string;
  /** False once the blocker lifted it; the row stays as the record. */
  active: boolean;
  blocked_at: string;
  unblocked_at: string | null;
}

export const USER_BLOCKS_TABLE = gql`
  query UserBlocksTable($query: TableQueryInput) {
    userBlocksTable(query: $query) {
      total
      rows {
        id
        blocker_id
        blocker_name
        blocked_id
        blocked_name
        active
        blocked_at
        unblocked_at
      }
    }
  }
`;
