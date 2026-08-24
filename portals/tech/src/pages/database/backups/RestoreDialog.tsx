import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatBytes, formatDateTime } from '../../server/format';
import { takenAt, type BackupRow } from './queries';

interface Props {
  backup: BackupRow;
  /**
   * The database this restore REPLACES. Not the row's own: an uploaded archive
   * usually comes from somewhere else, and naming the source as the thing about
   * to be destroyed would be a warning about the wrong database.
   */
  liveDatabase: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * The one destructive action on this page, and the only one that asks the
 * operator to type something.
 *
 * A restore drops every collection the archive carries and rewrites it, so
 * everything written since the archive was taken is gone — and unlike a
 * deleted archive there is nothing to undo it with. A one-click confirm is the
 * wrong shape for that, so the database name has to be typed before the button
 * turns on, the same guard every cloud console puts in front of the same
 * operation. The dialog leads with what is lost rather than what is gained.
 */
export default function RestoreDialog({
  backup,
  liveDatabase,
  busy,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === liveDatabase;
  // Worth saying out loud only when the two differ, which is exactly the case
  // an uploaded archive creates.
  const fromElsewhere = !!backup.database && backup.database !== liveDatabase;

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('tech.dbBackup.restoreTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="error">
            <AlertTitle>{t('tech.dbBackup.restoreWarningTitle')}</AlertTitle>
            {t('tech.dbBackup.restoreWarning', { vars: { database: liveDatabase } })}
          </Alert>

          {fromElsewhere && (
            <Alert severity="warning">
              {t('tech.dbBackup.restoreSource', {
                vars: { database: backup.database, live: liveDatabase },
              })}
            </Alert>
          )}

          <Stack spacing={0.5}>
            <Typography variant="body2">
              <strong>{t('tech.dbBackup.restoreFrom')}:</strong> {backup.fileName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('tech.dbBackup.restoreTaken', {
                vars: { when: formatDateTime(takenAt(backup)) },
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('tech.dbBackup.restoreContents', {
                vars: {
                  collections: String(backup.collectionsTotal),
                  documents: backup.documentsTotal.toLocaleString(),
                  size: formatBytes(backup.sizeBytes),
                },
              })}
            </Typography>
          </Stack>

          <Alert severity="info">{t('tech.dbBackup.restoreSkipNote')}</Alert>

          <TextField
            label={t('tech.dbBackup.restoreTypeLabel', { vars: { database: liveDatabase } })}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={busy}
            autoComplete="off"
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('tech.dbBackup.cancel')}
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={!matches || busy}>
          {busy ? t('tech.dbBackup.restoreStarting') : t('tech.dbBackup.restoreConfirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
