import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { uploadFileWithTicket } from '@duncit/media-picker';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import {
  COMPLETE_DB_BACKUP_UPLOAD,
  DB_BACKUP_UPLOAD_AUTH,
  type BackupUploadPass,
} from './queries';

/**
 * Sending one archive to the server: the pass, the bytes, and the read-through.
 *
 * Three calls rather than one because a browser cannot put its session header
 * on a raw file POST — the mutation authorises, the POST carries only a
 * single-use ticket, and the last call tells the server to read what landed.
 *
 * `reading` is not the same as `sending`: the bytes are all there by then and
 * the server is walking the archive to prove it is whole. That can take minutes
 * on a large one and keeps going after this page is closed, so the dialog stops
 * waiting on it the moment the row exists.
 */
export type UploadPhase = 'idle' | 'sending' | 'reading';

export function useBackupUpload(onUploaded: () => void) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [authorise] = useMutation<any>(DB_BACKUP_UPLOAD_AUTH);
  const [complete] = useMutation<any>(COMPLETE_DB_BACKUP_UPLOAD);

  const upload = useCallback(
    async (file: File): Promise<boolean> => {
      setError(null);
      setPercent(0);
      setPhase('sending');
      try {
        const authorised = await authorise({ variables: { fileName: file.name } });
        const pass = authorised.data?.dbBackupUploadAuth as BackupUploadPass | undefined;
        if (!pass) throw new Error(t('tech.dbBackup.uploadFailed'));
        await uploadFileWithTicket(file, pass, setPercent);
        setPhase('reading');
        await complete({ variables: { id: pass.backupId } });
        notifySuccess(t('tech.dbBackup.uploadedToast'));
        onUploaded();
        return true;
      } catch (err) {
        // Shown in the dialog AND as a toast: the dialog is where the operator
        // is looking, and the toast is what survives them closing it.
        const message = err instanceof Error ? err.message : t('tech.dbBackup.uploadFailed');
        setError(message);
        notifyError(message);
        return false;
      } finally {
        setPhase('idle');
      }
    },
    [authorise, complete, onUploaded, t],
  );

  return { upload, phase, percent, error };
}
