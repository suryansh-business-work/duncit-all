import { gql } from '@apollo/client';

export type E2eRunStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export type E2eRunTrigger = 'SCHEDULE' | 'PORTAL' | 'MANUAL';
export type E2eSuiteStatus = 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
export type E2eSuiteGroup = 'PORTAL' | 'APP' | 'SHARED';
export type E2eScheduleFrequency = 'DAILY' | 'WEEKLY';

export interface E2eSuite {
  key: string;
  label: string;
  group: E2eSuiteGroup;
}

export interface E2eSuiteResult {
  key: string;
  status: E2eSuiteStatus;
  specs: number | null;
  tests: number | null;
  passed: number | null;
  failed: number | null;
  skipped: number | null;
  duration_seconds: number | null;
  error: string;
  job_url: string;
  reported_at: string | null;
}

export interface E2eRunStage {
  name: string;
  at: string;
}

export interface E2eRunTotals {
  suites: number;
  suites_passed: number;
  suites_failed: number;
  suites_skipped: number;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface E2eRunRow {
  id: string;
  run_no: string;
  status: E2eRunStatus;
  trigger_source: E2eRunTrigger;
  triggered_by: string;
  ref: string;
  commit_sha: string;
  requested_suites: string[];
  results: E2eSuiteResult[];
  totals: E2eRunTotals;
  workflow_run_url: string;
  duration_seconds: number | null;
  stage: string;
  stages: E2eRunStage[];
  error_message: string;
  reported_by: string;
  identity_stamp: string;
  login_email: string;
  signup_email: string;
  identity_phone: string;
  slack_channel: string | null;
  slack_ts: string | null;
  slack_error: string | null;
  created_at: string | null;
}

export interface E2eRunSettings {
  enabled: boolean;
  frequency: E2eScheduleFrequency;
  time_of_day: string;
  weekday: number;
  ref: string;
  suites: string[];
  keep_last: number;
  email_prefix: string;
  email_domain: string;
  password_set: boolean;
  identity_phone: string;
  /** Hold every outbound email, WhatsApp message and one-time code inside the
   * platform while a suite runs. */
  mute_communications: boolean;
  /** Return one-time codes in the response instead of sending them. */
  otp_bypass: boolean;
  slack_channel: string | null;
  slack_configured: boolean;
  login_email_preview: string;
  signup_email_preview: string;
  last_run_at: string | null;
  next_run_at: string | null;
  last_reported_at: string | null;
  last_reported_by: string | null;
}

export interface E2eTriggerConfig {
  configured: boolean;
  repository: string;
  default_ref: string;
  reports_to: string;
}

const RUN_FIELDS = `
  id
  run_no
  status
  trigger_source
  triggered_by
  ref
  commit_sha
  requested_suites
  results {
    key
    status
    specs
    tests
    passed
    failed
    skipped
    duration_seconds
    error
    job_url
    reported_at
  }
  totals {
    suites
    suites_passed
    suites_failed
    suites_skipped
    tests
    passed
    failed
    skipped
  }
  workflow_run_url
  duration_seconds
  stage
  stages {
    name
    at
  }
  error_message
  reported_by
  identity_stamp
  login_email
  signup_email
  identity_phone
  slack_channel
  slack_ts
  slack_error
  created_at
`;

export const E2E_RUNS_TABLE = gql`
  query E2eRunsTable($query: TableQueryInput) {
    e2eRunsTable(query: $query) {
      rows {
        ${RUN_FIELDS}
      }
      total
      page
      page_size
    }
  }
`;

export const E2E_SUITE_CATALOGUE = gql`
  query E2eSuiteCatalogue {
    e2eSuiteCatalogue {
      key
      label
      group
    }
  }
`;

export const E2E_TRIGGER_CONFIG = gql`
  query E2eTriggerConfig {
    e2eTriggerConfig {
      configured
      repository
      default_ref
      reports_to
    }
  }
`;

export const E2E_RUN_SETTINGS = gql`
  query E2eRunSettings {
    e2eRunSettings {
      enabled
      frequency
      time_of_day
      weekday
      ref
      suites
      keep_last
      email_prefix
      email_domain
      password_set
      identity_phone
      mute_communications
      otp_bypass
      slack_channel
      slack_configured
      login_email_preview
      signup_email_preview
      last_run_at
      next_run_at
      last_reported_at
      last_reported_by
    }
  }
`;

export const TRIGGER_E2E_RUN = gql`
  mutation TriggerE2eRun($input: TriggerE2eRunInput!) {
    triggerE2eRun(input: $input) {
      run {
        id
        run_no
        ref
        signup_email
      }
      actions_url
    }
  }
`;

export const UPDATE_E2E_RUN_SETTINGS = gql`
  mutation UpdateE2eRunSettings($input: UpdateE2eRunSettingsInput!) {
    updateE2eRunSettings(input: $input) {
      enabled
      time_of_day
      next_run_at
    }
  }
`;

export const DELETE_E2E_RUN = gql`
  mutation DeleteE2eRun($id: ID!) {
    deleteE2eRun(id: $id)
  }
`;

/** A row the workflow is still working on. */
export const isLive = (row: E2eRunRow) => row.status === 'QUEUED' || row.status === 'RUNNING';

/**
 * How long a live row has been live. A run that has not moved in this long is
 * almost certainly not running: the runner was cancelled or killed, and nothing
 * is left to close the row.
 */
const STALE_AFTER_MINUTES = 90;

export function runningMinutes(row: E2eRunRow): number {
  if (!row.created_at) return 0;
  const started = new Date(row.created_at).getTime();
  return Math.max(Math.floor((Date.now() - started) / 60_000), 0);
}

export const isStaleRunning = (row: E2eRunRow) =>
  isLive(row) && runningMinutes(row) > STALE_AFTER_MINUTES;

/** `12m 04s`, or an em dash when the run never said how long it took. */
export function durationLabel(row: { duration_seconds: number | null }): string {
  const seconds = row.duration_seconds;
  if (seconds === null || seconds < 0) return '—';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
}

/** `142 / 150` — how many of the tests that ran actually passed. */
export function testsLabel(row: E2eRunRow): string {
  if (row.totals.tests === 0) return '—';
  return `${row.totals.passed} / ${row.totals.tests}`;
}

/** `18 of 20` — how many suites reported, against how many the run asked for. */
export function suitesLabel(row: E2eRunRow): string {
  const ran = row.totals.suites_passed + row.totals.suites_failed;
  return `${ran} / ${row.totals.suites}`;
}
