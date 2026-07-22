import { gql } from '@apollo/client';

/** Server-side, paginated + filterable bug list (rolled-up error logs). */
export const BUGS_TABLE = gql`
  query BugsTable($query: TableQueryInput) {
    bugsTable(query: $query) {
      total
      rows {
        id
        title
        error_name
        message
        page
        source
        app
        platform
        os
        occurrence_count
        first_seen_at
        last_seen_at
        env_counts {
          localhost
          staging
          production
        }
        last_url
        last_host
        last_stack
        status
      }
    }
  }
`;

export const UPDATE_BUG_STATUS = gql`
  mutation UpdateBugStatus($bug_id: ID!, $status: String!) {
    updateBugStatus(bug_id: $bug_id, status: $status) {
      id
      status
    }
  }
`;

export type BugStatus = 'OPEN' | 'RESOLVED' | 'IGNORED';

export interface BugRow {
  id: string;
  title: string;
  error_name: string;
  message: string;
  page: string;
  source: string;
  app: string;
  platform: string;
  os: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  env_counts: { localhost: number; staging: number; production: number };
  last_url: string | null;
  last_host: string | null;
  last_stack: string | null;
  status: BugStatus;
}

export const STATUS_OPTIONS: ReadonlyArray<{ value: BugStatus; label: string }> = [
  { value: 'OPEN', label: 'Open' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'IGNORED', label: 'Ignored' },
];

const STATUS_COLOR: Record<BugStatus, 'error' | 'success' | 'default'> = {
  OPEN: 'error',
  RESOLVED: 'success',
  IGNORED: 'default',
};

export const statusColor = (s: BugStatus) => STATUS_COLOR[s] ?? 'default';
