import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from '@duncit/shell';
import { formatBytes } from '../../server/format';
import { useBackupUpload } from './useBackupUpload';

/** What this server writes its archives as; anything else is not one. */
const ARCHIVE_EXTENSION = '.dbk.gz';

interface Props {
  /** The most one upload can be — nginx and the route agree on this number. */
  maxBytes: number;
  onClose: () => void;
  onUploaded: () => void;
}

/**
 * Sending an archive back to the server.
 *
 * The size check happens HERE, before a pass is even asked for, because the
 * alternative is discovering the ceiling from a 413 after several minutes of
 * uploading. The number is the server's own, not a copy of it.
 */
export default function UploadBackupDialog({ maxBytes, onClose, onUploaded }: Readonly<Props>) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const { upload, phase, percent, error } = useBackupUpload(onUploaded);
  const busy = phase !== 'idle';

  const onPick = (picked: File | null) => {
    setRejected(null);
    setFile(null);
    if (!picked) return;
    if (!picked.name.toLowerCase().endsWith(ARCHIVE_EXTENSION)) {
      setRejected(t('tech.dbBackup.uploadWrongType', { vars: { extension: ARCHIVE_EXTENSION } }));
      return;
    }
    if (picked.size > maxBytes) {
      setRejected(
        t('tech.dbBackup.uploadTooLarge', {
          vars: { size: formatBytes(picked.size), max: formatBytes(maxBytes) },
        }),
      );
      return;
    }
    setFile(picked);
  };

  const onConfirm = async () => {
    if (!file) return;
    const sent = await upload(file);
    if (sent) onClose();
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('tech.dbBackup.uploadTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('tech.dbBackup.uploadIntro')}
          </Typography>

          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            disabled={busy}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('tech.dbBackup.uploadChoose')}
            <input
              type="file"
              hidden
              accept={ARCHIVE_EXTENSION}
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
          </Button>

          {file && (
            <Typography variant="body2">
              <strong>{file.name}</strong> · {formatBytes(file.size)}
            </Typography>
          )}

          <Typography variant="caption" color="text.secondary">
            {t('tech.dbBackup.uploadLimit', { vars: { size: formatBytes(maxBytes) } })}
          </Typography>

          {rejected && <Alert severity="warning">{rejected}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          {phase === 'sending' && (
            <Stack spacing={0.5}>
              <LinearProgress variant="determinate" value={percent} />
              <Typography variant="caption" color="text.secondary">
                {t('tech.dbBackup.uploadProgress', { vars: { percent: String(percent) } })}
              </Typography>
            </Stack>
          )}
          {phase === 'reading' && (
            <Stack spacing={0.5}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary">
                {t('tech.dbBackup.uploadReading')}
              </Typography>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('tech.dbBackup.cancel')}
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={!file || busy}>
          {t('tech.dbBackup.uploadAction')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
