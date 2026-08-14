import { gql } from '@apollo/client';
import { ISSUE_LOG_COMPONENT } from '@duncit/errors';
import type { TableFilterValue } from '@duncit/table';

/**
 * The Error Logs section reads the same persisted telemetry rows as the rest
 * of the Telemetry pages, pinned to the error-module marker: every surface's
 * @duncit/errors integration logs its parsed server-operation failures with
 * component = 'serverIssue', and this filter is what makes those rows a
 * section of their own.
 */
export const ERROR_LOGS_TABLE = gql`
  query ErrorLogsTable($query: TableQueryInput) {
    telemetryLogsTable(query: $query) {
      total
      rows {
        id
        app
        portal
        platform
        os
        environment
        source
        level
        page
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
  }
`;

export interface ErrorLogRow {
  id: string;
  app: string;
  portal: string | null;
  platform: string;
  os: string | null;
  environment: string;
  source: string;
  level: string;
  page: string;
  component: string;
  url: string | null;
  host: string | null;
  error: { name: string; message: string; stack: string | null } | null;
  data_json: string | null;
  created_at: string;
}

/** The parsed-issue fields @duncit/errors ships inside the log's data blob. */
export interface IssueData {
  kind?: string;
  code?: string;
  operation?: string;
  gql_path?: string;
}

export function parseIssueData(row: ErrorLogRow): IssueData {
  if (!row.data_json) return {};
  try {
    return JSON.parse(row.data_json) as IssueData;
  } catch {
    return {};
  }
}

/** Pinned server-side, so paging and search stay inside the module's rows.
 * The marker comes from the package itself, so the two can never drift. */
export const ERROR_MODULE_FILTER: readonly TableFilterValue[] = [
  { field: 'component', op: 'eq', value: ISSUE_LOG_COMPONENT },
];

export const ENV_OPTIONS = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'localhost', label: 'Localhost' },
];
