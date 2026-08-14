import { gql } from '@apollo/client';

/**
 * Every field a persisted log carries. The table, the detail dialog and the
 * export all read this one fragment, so a field added to the record shows up
 * in all three at once rather than in whichever was remembered.
 */
const LOG_FIELDS = gql`
  fragment TelemetryLogFields on TelemetryLog {
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
    user_id
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
      screen
      viewport
      network
      referrer
    }
    duid
    session_id
    ip
    user_agent
    created_at
  }
`;

/** Server-side, paginated + filterable log list. One level per table. */
export const TELEMETRY_LOGS_TABLE = gql`
  query TelemetryLogsTable($query: TableQueryInput) {
    telemetryLogsTable(query: $query) {
      total
      rows {
        ...TelemetryLogFields
      }
    }
  }
  ${LOG_FIELDS}
`;

/** One level's logs, newest first — the JSON export (server-bounded). */
export const TELEMETRY_LOGS_EXPORT = gql`
  query TelemetryLogsExport($level: String, $limit: Int) {
    telemetryLogsExport(level: $level, limit: $limit) {
      ...TelemetryLogFields
    }
  }
  ${LOG_FIELDS}
`;

export const IMPORT_TELEMETRY_LOGS = gql`
  mutation ImportTelemetryLogs($logs: [TelemetryLogImportInput!]!) {
    importTelemetryLogs(logs: $logs) {
      created
      skipped
      expiring
    }
  }
`;

import type { TelemetryUserRef } from '../../components/telemetry-identity';

export type TelemetryLevel = 'error' | 'warn' | 'info' | 'debug';

/** The one telemetry user shape, shared with Bugs and Error Logs. */
export type TelemetryLogUser = TelemetryUserRef;

export interface TelemetryLogClient {
  app_version: string | null;
  device_model: string | null;
  device_os_version: string | null;
  locale: string | null;
  timezone: string | null;
  screen: string | null;
  viewport: string | null;
  network: string | null;
  referrer: string | null;
}

export interface TelemetryLogRow {
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
  user_id: string | null;
  user: TelemetryLogUser | null;
  client: TelemetryLogClient | null;
  duid: string | null;
  session_id: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

/** The four tables, in the order they are read: loudest first. */
export const LEVEL_TABS: ReadonlyArray<{ value: TelemetryLevel; label: string; blurb: string }> = [
  {
    value: 'error',
    label: 'Error',
    blurb: 'Something broke. Every one of these also rolls up into a bug.',
  },
  { value: 'warn', label: 'Warn', blurb: 'Something recovered, but not the way it was meant to.' },
  { value: 'info', label: 'Info', blurb: 'Milestones worth keeping — sign-ins, jobs, payments.' },
  { value: 'debug', label: 'Debug', blurb: 'Detail kept only while a problem is being chased.' },
];

