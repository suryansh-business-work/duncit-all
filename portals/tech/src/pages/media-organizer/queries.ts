import { gql } from '@apollo/client';

/** Selections are written out in full so scripts/verify-gql-schema.mjs can read them. */

export const MEDIA_ORGANIZER_RUNS = gql`
  query MediaOrganizerRuns {
    mediaOrganizerRuns {
      run_id
      started_at
      PENDING
      DONE
      IN_PLACE
      SHARED
      FAILED
      ROLLED_BACK
    }
  }
`;

export const MEDIA_ORGANIZER_FILES_TABLE = gql`
  query MediaOrganizerFilesTable($run_id: ID!, $query: TableQueryInput) {
    mediaOrganizerFilesTable(run_id: $run_id, query: $query) {
      rows {
        id
        file_path
        new_file_path
        owners
        status
        error
        references
        rewritten
      }
      total
      page
      page_size
    }
  }
`;

export const START_MEDIA_ORGANIZER = gql`
  mutation StartMediaOrganizer($dry_run: Boolean!, $url: String) {
    startMediaOrganizer(dry_run: $dry_run, url: $url) {
      id
    }
  }
`;

export const APPLY_MEDIA_ORGANIZER_RUN = gql`
  mutation ApplyMediaOrganizerRun($run_id: ID!, $url: String) {
    applyMediaOrganizerRun(run_id: $run_id, url: $url) {
      id
    }
  }
`;

export const ROLLBACK_MEDIA_ORGANIZER_RUN = gql`
  mutation RollbackMediaOrganizerRun($run_id: ID!, $url: String) {
    rollbackMediaOrganizerRun(run_id: $run_id, url: $url) {
      id
    }
  }
`;

export type RelocationStatus = 'PENDING' | 'DONE' | 'IN_PLACE' | 'SHARED' | 'FAILED' | 'ROLLED_BACK';

export interface OrganizerRun extends Record<RelocationStatus, number> {
  run_id: string;
  started_at: string;
}

export interface RelocationRow {
  id: string;
  file_path: string;
  new_file_path: string;
  owners: string[];
  status: RelocationStatus;
  error: string;
  references: number;
  rewritten: number;
}

/** The header drawer's query, refetched so a job started here shows at once. */
export const BACKGROUND_JOBS_QUERY = 'MyBackgroundJobs';
