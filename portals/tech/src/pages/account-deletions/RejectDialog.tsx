import { useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  open: boolean;
  onConfirm: (note: string) => Promise<void> | void;
  onClose: () => void;
}

/** Turning a request down. The note is required because somebody in Support
 * has to tell the member why, and "rejected" on its own is not an answer. */
export default function RejectDialog({ open, onConfirm, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setNote('');
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    try {
      await onConfirm(note.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : close} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t('tech.accountDeletions.rejectTitle')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>{t('tech.accountDeletions.rejectMessage')}</DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            size="small"
            value={note}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
            label={t('tech.accountDeletions.rejectNoteLabel')}
            placeholder={t('tech.accountDeletions.rejectNotePlaceholder')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={close} disabled={busy}>
          {t('tech.accountDeletions.close')}
        </DuncitButton>
        <DuncitButton
          color="error"
          variant="contained"
          onClick={() => {
            submit().catch(() => undefined);
          }}
          disabled={!note.trim() || busy}
        >
          {t('tech.accountDeletions.reject')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
