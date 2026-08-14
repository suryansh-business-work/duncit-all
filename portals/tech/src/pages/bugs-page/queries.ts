import { gql } from '@apollo/client';

/** Every field a bug carries — the table, the detail dialog and the export all read this. */
const BUG_FIELDS = gql`
  fragment BugFields on Bug {
    id
    fingerprint
    title
    error_name
    message
    page
    source
    app
    portal
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
    resolved_at
    resolved_by
    created_at
  }
`;

/** Server-side, paginated + filterable bug list (rolled-up error logs). */
export const BUGS_TABLE = gql`
  query BugsTable($query: TableQueryInput) {
    bugsTable(query: $query) {
      total
      rows {
        ...BugFields
      }
    }
  }
  ${BUG_FIELDS}
`;

/** Every bug, unpaginated — the JSON export. */
export const BUGS_EXPORT = gql`
  query BugsExport {
    bugsExport {
      ...BugFields
    }
  }
  ${BUG_FIELDS}
`;

/** The recent persisted error logs that rolled up into one bug. */
export const BUG_OCCURRENCES = gql`
  query BugOccurrences($bug_id: ID!, $limit: Int) {
    bugOccurrences(bug_id: $bug_id, limit: $limit) {
      id
      environment
      platform
      os
      component
      url
      host
      error {
        name
        message
        stack
      }
      data_json
      created_at
    }
  }
`;

export const UPDATE_BUG_STATUS = gql`
  mutation UpdateBugStatus($bug_id: ID!, $status: String!) {
    updateBugStatus(bug_id: $bug_id, status: $status) {
      id
      status
      resolved_at
      resolved_by
    }
  }
`;

export const DELETE_BUGS = gql`
  mutation DeleteBugs($ids: [ID!]!) {
    deleteBugs(ids: $ids)
  }
`;

export const DELETE_ALL_BUGS = gql`
  mutation DeleteAllBugs {
    deleteAllBugs
  }
`;

export const IMPORT_BUGS = gql`
  mutation ImportBugs($bugs: [BugImportInput!]!) {
    importBugs(bugs: $bugs) {
      created
      updated
    }
  }
`;

export type BugStatus = 'OPEN' | 'RESOLVED' | 'IGNORED';

export interface BugRow {
  id: string;
  fingerprint: string;
  title: string;
  error_name: string;
  message: string;
  page: string;
  source: string;
  app: string;
  portal: string | null;
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
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface BugOccurrence {
  id: string;
  environment: string;
  platform: string;
  os: string | null;
  component: string;
  url: string | null;
  host: string | null;
  error: { name: string; message: string; stack: string | null } | null;
  data_json: string | null;
  created_at: string;
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
