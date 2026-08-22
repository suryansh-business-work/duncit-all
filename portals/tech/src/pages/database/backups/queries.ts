import { gql } from '@apollo/client';

/**
 * Selections are written out in full rather than shared through an interpolated
 * `${FIELDS}` constant. scripts/verify-gql-schema.mjs SKIPS any document it
 * cannot read statically, so hoisting fields would quietly take these queries
 * out of the one gate that checks them against the server's schema.
 */
export const DB_BACKUPS_TABLE = gql`
  query DbBackupsTable($query: TableQueryInput) {
    dbBackupsTable(query: $query) {
      rows {
        id
        status
        trigger
        database
        fileName
        hasFile
        sizeBytes
        rawBytes
        documentsTotal
        collectionsTotal
        currentCollection
        error
        startedBy
        startedAt
        finishedAt
      }
      total
      page
      page_size
    }
  }
`;

export const DB_BACKUP_SETTINGS = gql`
  query DbBackupSettings {
    dbBackupSettings {
      enabled
      frequency
      timeOfDay
      weekday
      keepLast
      lastRunAt
      nextRunAt
    }
  }
`;

export const DB_RESTORE_JOB = gql`
  query DbRestoreJob($id: ID) {
    dbRestoreJob(id: $id) {
      id
      status
      backupId
      backupFile
      backupTakenAt
      collectionsTotal
      currentCollection
      documentsRestored
      skipped
      error
      startedBy
      startedAt
      finishedAt
    }
  }
`;

export const RUN_DB_BACKUP = gql`
  mutation RunDbBackup {
    runDbBackup {
      id
      status
    }
  }
`;

export const SAVE_DB_BACKUP_SETTINGS = gql`
  mutation SaveDbBackupSettings($input: DbBackupSettingsInput!) {
    saveDbBackupSettings(input: $input) {
      enabled
      frequency
      timeOfDay
      weekday
      keepLast
      lastRunAt
      nextRunAt
    }
  }
`;

export const DELETE_DB_BACKUP = gql`
  mutation DeleteDbBackup($id: ID!) {
    deleteDbBackup(id: $id) {
      id
      hasFile
    }
  }
`;

export const REQUEST_DB_BACKUP_DOWNLOAD = gql`
  mutation RequestDbBackupDownload($id: ID!) {
    requestDbBackupDownload(id: $id) {
      url
      fileName
      expiresInSeconds
    }
  }
`;

export const RESTORE_DB_BACKUP = gql`
  mutation RestoreDbBackup($id: ID!) {
    restoreDbBackup(id: $id) {
      id
      status
    }
  }
`;

export type BackupStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED';
export type BackupTrigger = 'SCHEDULED' | 'MANUAL';

export interface BackupRow {
  id: string;
  status: BackupStatus;
  trigger: BackupTrigger;
  database: string;
  fileName: string | null;
  hasFile: boolean;
  sizeBytes: number;
  rawBytes: number;
  documentsTotal: number;
  collectionsTotal: number;
  currentCollection: string | null;
  error: string | null;
  startedBy: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface BackupSettings {
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY';
  timeOfDay: string;
  weekday: number;
  keepLast: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface RestoreJob {
  id: string;
  status: BackupStatus;
  backupId: string;
  backupFile: string;
  backupTakenAt: string | null;
  collectionsTotal: number;
  currentCollection: string | null;
  documentsRestored: number;
  skipped: string[];
  error: string | null;
  startedBy: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export const getRowId = (row: BackupRow) => row.id;

/** A backup or restore still moving, so the page keeps polling. */
export const isRunning = (job?: { status: BackupStatus } | null) => job?.status === 'RUNNING';

/**
 * How much smaller the archive is than the data it holds, e.g. "4.2×".
 * Only meaningful once both numbers are in, which is when the walk finishes.
 */
export function compressionLabel(row: BackupRow): string {
  if (!row.rawBytes || !row.sizeBytes) return '—';
  return `${(row.rawBytes / row.sizeBytes).toFixed(1)}×`;
}
