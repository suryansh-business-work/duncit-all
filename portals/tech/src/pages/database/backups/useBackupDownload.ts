import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { REQUEST_DB_BACKUP_DOWNLOAD } from './queries';

/**
 * Download one archive — the Backups table's row action and the backup store
 * card's "download latest" share this.
 *
 * A link is minted per click and lives for minutes, so it is opened straight
 * away rather than rendered into the row as an href that would go stale
 * sitting on screen.
 */
export function useBackupDownload() {
  const { t } = useTranslation();
  const [requestDownload] = useMutation<any>(REQUEST_DB_BACKUP_DOWNLOAD);
  return useCallback(
    async (row: { id: string }) => {
      try {
        const result = await requestDownload({ variables: { id: row.id } });
        const url = result.data?.requestDbBackupDownload?.url;
        if (url) globalThis.open(url, '_blank', 'noopener');
      } catch (err) {
        notifyError(err instanceof Error ? err.message : t('tech.dbBackup.downloadFailed'));
      }
    },
    [requestDownload, t],
  );
}
