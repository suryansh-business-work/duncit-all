import { gql } from '@apollo/client';
import type { TelemetryClientRef, TelemetryUserRef } from '../../components/telemetry-identity';

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
    last_user {
      id
      name
      email
      phone
      roles
    }
    last_environment
    last_app_version
    last_user_agent
    last_duid
    last_session_id
    last_ip
    last_client {
      app_version
      device_model
      device_os_version
      locale
      timezone
      screen
      viewport
      network
      referrer
    }
    affected_user_count
    affected_user_ids
    anonymous_count
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
      user {
        id
        name
        email
        phone
        roles
      }
      client {
        app_version
        device_model
        device_os_version
        locale
        timezone
        network
      }
      duid
      session_id
      ip
      user_agent
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

/** The one telemetry user shape, shared with Logs and Error Logs. */
export type BugUser = TelemetryUserRef;

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
  last_user: BugUser | null;
  last_environment: string | null;
  last_app_version: string | null;
  last_user_agent: string | null;
  last_duid: string | null;
  last_session_id: string | null;
  last_ip: string | null;
  last_client: TelemetryClientRef | null;
  affected_user_count: number;
  affected_user_ids: string[];
  anonymous_count: number;
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
  user: BugUser | null;
  client: {
    app_version: string | null;
    device_model: string | null;
    device_os_version: string | null;
    locale: string | null;
    timezone: string | null;
    network: string | null;
  } | null;
  duid: string | null;
  session_id: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

/** `12 users · 3 signed out` — who a bug actually reaches. */
export function affectedSummary(bug: {
  affected_user_count: number;
  anonymous_count: number;
}): string {
  const parts: string[] = [];
  if (bug.affected_user_count > 0) {
    parts.push(`${bug.affected_user_count} user${bug.affected_user_count === 1 ? '' : 's'}`);
  }
  if (bug.anonymous_count > 0) parts.push(`${bug.anonymous_count} signed out`);
  return parts.length > 0 ? parts.join(' · ') : '—';
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
