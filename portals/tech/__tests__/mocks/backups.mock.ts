import type { BackupRow, BackupSettings, BackupStore, RestoreJob } from '../../src/pages/database/backups/queries';

export const backupRow = (over: Partial<BackupRow> = {}): BackupRow => ({
  id: 'b1',
  status: 'SUCCEEDED',
  trigger: 'MANUAL',
  database: 'duncit',
  fileName: 'duncit-1.dbk.gz',
  hasFile: true,
  sizeBytes: 2048,
  rawBytes: 8192,
  documentsTotal: 1500,
  collectionsTotal: 12,
  currentCollection: null,
  error: null,
  startedBy: 'ops@example.test',
  startedAt: '2026-01-01T03:00:00.000Z',
  archiveTakenAt: null,
  finishedAt: '2026-01-01T03:05:00.000Z',
  ...over,
});

export const backupSettings = (over: Partial<BackupSettings> = {}): BackupSettings =>
  ({
    liveDatabase: 'duncit',
    uploadMaxBytes: 1000,
    enabled: true,
    frequency: 'DAILY',
    timeOfDay: '03:00',
    weekday: 1,
    keepLast: 7,
    lastRunAt: null,
    nextRunAt: '2026-01-02T03:00:00.000Z',
    ...over,
  }) as BackupSettings;

export const backupStore = (over: Partial<BackupStore> = {}): BackupStore => ({
  directory: '/var/backups',
  archives: 3,
  archiveBytes: 4096,
  newestArchiveAt: '2026-01-01T03:05:00.000Z',
  fsFreeBytes: 1_000_000,
  fsTotalBytes: 9_000_000,
  latest: backupRow(),
  ...over,
});

export const restoreJob = (over: Partial<RestoreJob> = {}): RestoreJob => ({
  id: 'r1',
  status: 'SUCCEEDED',
  backupId: 'b1',
  backupFile: 'duncit-1.dbk.gz',
  backupTakenAt: null,
  collectionsTotal: 12,
  currentCollection: null,
  documentsRestored: 1500,
  skipped: [],
  error: null,
  startedBy: null,
  startedAt: null,
  finishedAt: '2026-01-01T04:00:00.000Z',
  ...over,
});
