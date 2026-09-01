import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useApolloTableFetch, type TableFetch } from '@duncit/table';
import { useConfirm, notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import {
  DB_BACKUPS_TABLE,
  DB_BACKUP_SETTINGS,
  DB_RESTORE_JOB,
  DELETE_DB_BACKUP,
  REQUEST_DB_BACKUP_DOWNLOAD,
  RESTORE_DB_BACKUP,
  RUN_DB_BACKUP,
  SAVE_DB_BACKUP_SETTINGS,
  isRunning,
  type BackupRow,
  type BackupSettings,
  type RestoreJob,
} from './queries';
import type { BackupSettingsForm } from './schema';

/**
 * How often the page refreshes while something is moving. A backup of a real
 * database takes minutes, so this is about watching it tick rather than
 * catching the instant it lands.
 */
const LIVE_POLL_MS = 5_000;

const messageOf = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/**
 * Everything the Backups page does, kept out of its render so the page stays a
 * layout. Polls only while a backup or a restore is actually running.
 */
export function useBackups() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupRow | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [liveBackup, setLiveBackup] = useState(false);

  const settingsQuery = useQuery<{ dbBackupSettings: BackupSettings }>(DB_BACKUP_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const restoreQuery = useQuery<{ dbRestoreJob: RestoreJob | null }>(DB_RESTORE_JOB, {
    fetchPolicy: 'cache-and-network',
  });
  const restore = restoreQuery.data?.dbRestoreJob ?? null;

  const [runBackup, runState] = useMutation<any>(RUN_DB_BACKUP);
  const [saveSettings, saveState] = useMutation<any>(SAVE_DB_BACKUP_SETTINGS);
  const [removeBackup] = useMutation<any>(DELETE_DB_BACKUP);
  const [requestDownload] = useMutation<any>(REQUEST_DB_BACKUP_DOWNLOAD);
  const [startRestore, restoreState] = useMutation<any>(RESTORE_DB_BACKUP);

  const baseFetch = useApolloTableFetch<BackupRow>(client, DB_BACKUPS_TABLE, 'dbBackupsTable');

  // The page it just fetched is what decides whether to keep polling: no
  // running backup on screen, no timer.
  const fetchRows = useCallback<TableFetch<BackupRow>>(
    async (query) => {
      const page = await baseFetch(query);
      setLiveBackup(page.rows.some(isRunning));
      return page;
    },
    [baseFetch],
  );

  const live = liveBackup || isRunning(restore);

  useEffect(() => {
    if (!live) return undefined;
    const timer = globalThis.setInterval(() => {
      refetchRef.current?.();
      restoreQuery.refetch().catch(() => undefined);
      settingsQuery.refetch().catch(() => undefined);
    }, LIVE_POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [live, restoreQuery, settingsQuery]);

  /** An uploaded archive is a new row, so the table has to be asked again. */
  const onUploaded = useCallback(() => {
    refetchRef.current?.();
  }, []);

  const onRunNow = useCallback(async () => {
    try {
      await runBackup();
      refetchRef.current?.();
      notifySuccess(t('tech.dbBackup.startedToast'));
    } catch (err) {
      notifyError(messageOf(err, t('tech.dbBackup.statusFailed')));
    }
  }, [runBackup, t]);

  const onSaveSettings = useCallback(
    async (values: BackupSettingsForm) => {
      setSettingsError(null);
      try {
        await saveSettings({ variables: { input: values } });
        await settingsQuery.refetch();
        notifySuccess(t('tech.dbBackup.savedToast'));
      } catch (err) {
        setSettingsError(messageOf(err, t('tech.dbBackup.saveFailed')));
      }
    },
    [saveSettings, settingsQuery, t],
  );

  /**
   * A link is minted per click and lives for minutes, so it is opened straight
   * away rather than rendered into the row as an href that would go stale
   * sitting on screen.
   */
  const onDownload = useCallback(
    async (row: BackupRow) => {
      try {
        const result = await requestDownload({ variables: { id: row.id } });
        const url = result.data?.requestDbBackupDownload?.url;
        if (url) globalThis.open(url, '_blank', 'noopener');
      } catch (err) {
        notifyError(messageOf(err, t('tech.dbBackup.downloadFailed')));
      }
    },
    [requestDownload, t],
  );

  const onDelete = useCallback(
    async (row: BackupRow) => {
      const ok = await confirm({
        title: t('tech.dbBackup.deleteTitle'),
        message: t('tech.dbBackup.deleteMessage', { vars: { file: row.fileName ?? '' } }),
        confirmLabel: t('tech.dbBackup.deleteAction'),
        cancelLabel: t('tech.dbBackup.cancel'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await removeBackup({ variables: { id: row.id } });
        refetchRef.current?.();
        notifySuccess(t('tech.dbBackup.deletedToast'));
      } catch (err) {
        notifyError(messageOf(err, t('tech.dbBackup.deleteFailed')));
      }
    },
    [confirm, removeBackup, t],
  );

  const onConfirmRestore = useCallback(async () => {
    if (!restoreTarget) return;
    try {
      await startRestore({ variables: { id: restoreTarget.id } });
      setRestoreTarget(null);
      await restoreQuery.refetch();
    } catch (err) {
      notifyError(messageOf(err, t('tech.dbBackup.restoreFailed')));
    }
  }, [restoreTarget, startRestore, restoreQuery, t]);

  return {
    settings: settingsQuery.data?.dbBackupSettings ?? null,
    settingsLoading: settingsQuery.loading,
    settingsQueryError: settingsQuery.error?.message ?? null,
    settingsError,
    saving: saveState.loading,
    restore,
    fetchRows,
    refetchRef,
    running: live,
    starting: runState.loading,
    restoring: restoreState.loading,
    restoreTarget,
    setRestoreTarget,
    uploadOpen,
    setUploadOpen,
    onUploaded,
    onRunNow,
    onSaveSettings,
    onDownload,
    onDelete,
    onConfirmRestore,
  };
}
