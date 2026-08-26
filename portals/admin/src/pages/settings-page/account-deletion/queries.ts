import { gql } from '@apollo/client';

export interface CronSettings {
  retention_days: number;
  cron_enabled: boolean;
  cron_frequency: 'DAILY' | 'WEEKLY';
  cron_time_of_day: string;
  cron_weekday: number;
  cron_batch_size: number;
  last_run_at: string | null;
  next_run_at: string | null;
}

export interface RunResult {
  request_id: string;
  user_id: string;
  email: string;
  outcome: string;
  records: number;
  error: string;
}

export interface DeletionRun {
  id: string;
  run_id: string;
  trigger: string;
  status: string;
  cutoff_at: string;
  retention_days: number;
  eligible: number;
  purged: number;
  failed: number;
  error: string;
  started_at: string;
  finished_at: string | null;
  results: RunResult[];
}

const SETTINGS_FIELDS = `
  retention_days
  cron_enabled
  cron_frequency
  cron_time_of_day
  cron_weekday
  cron_batch_size
  last_run_at
  next_run_at
`;

const RUN_FIELDS = `
  id
  run_id
  trigger
  status
  cutoff_at
  retention_days
  eligible
  purged
  failed
  error
  started_at
  finished_at
  results {
    request_id
    user_id
    email
    outcome
    records
    error
  }
`;

export const ACCOUNT_DELETION_CRON = gql`
  query AccountDeletionCronSettings {
    accountDeletionCronSettings {
      ${SETTINGS_FIELDS}
    }
    accountDeletionDueCount
  }
`;

export const UPDATE_ACCOUNT_DELETION_CRON = gql`
  mutation UpdateAccountDeletionCron($input: UpdateAccountDeletionCronInput!) {
    updateAccountDeletionCron(input: $input) {
      ${SETTINGS_FIELDS}
    }
  }
`;

/**
 * The window is a SEPARATE mutation from the schedule on purpose.
 *
 * They are different kinds of thing: the window is a promise already made to
 * everyone waiting in the queue, the schedule is an operational knob. The
 * server refuses to let one save move the other, and the console asks for them
 * with two saves so nothing about the UI suggests otherwise.
 */
export const UPDATE_RETENTION_DAYS = gql`
  mutation UpdateAccountDeletionRetention($retention_days: Int!) {
    updateAccountDeletionSettings(retention_days: $retention_days) {
      retention_days
    }
  }
`;

export const RUN_DELETION_PURGE_NOW = gql`
  mutation RunAccountDeletionPurgeNow {
    runAccountDeletionPurgeNow {
      ${RUN_FIELDS}
    }
  }
`;

export const ACCOUNT_DELETION_RUNS = gql`
  query AccountDeletionRuns($query: TableQueryInput) {
    accountDeletionRuns(query: $query) {
      rows {
        ${RUN_FIELDS}
      }
      total
      page
      page_size
    }
  }
`;
