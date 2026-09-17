import { gql } from '@apollo/client';

export type BackgroundJobStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/** One row a bulk delete could not remove, with its delete's own reason. */
export interface BackgroundJobFailure {
  id: string;
  message: string;
}

/** A long-running piece of work the signed-in person started — a bulk delete today. */
export interface BackgroundJob {
  id: string;
  table: string;
  label: string;
  url: string;
  mode: 'SELECTED' | 'ALL';
  status: BackgroundJobStatus;
  total: number;
  succeeded: number;
  failed: number;
  failures: BackgroundJobFailure[];
  error_message: string;
  created_at: string;
  finished_at: string | null;
}

export const BULK_DELETABLE_TABLES = gql`
  query BulkDeletableTables {
    bulkDeletableTables
  }
`;

export const MY_BACKGROUND_JOBS = gql`
  query MyBackgroundJobs {
    myBackgroundJobs {
      id
      table
      label
      url
      mode
      status
      total
      succeeded
      failed
      failures {
        id
        message
      }
      error_message
      created_at
      finished_at
    }
  }
`;

export const START_BULK_DELETE = gql`
  mutation StartBulkDelete($input: StartBulkDeleteInput!) {
    startBulkDelete(input: $input) {
      id
      status
    }
  }
`;

export const CANCEL_BACKGROUND_JOB = gql`
  mutation CancelBackgroundJob($id: ID!) {
    cancelBackgroundJob(id: $id) {
      id
      status
    }
  }
`;

export const DISMISS_BACKGROUND_JOB = gql`
  mutation DismissBackgroundJob($id: ID!) {
    dismissBackgroundJob(id: $id)
  }
`;

export const CLEAR_FINISHED_BACKGROUND_JOBS = gql`
  mutation ClearFinishedBackgroundJobs {
    clearFinishedBackgroundJobs
  }
`;
