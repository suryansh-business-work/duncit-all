import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  open: boolean;
  /** The request reference, which is also what must be typed back. */
  code: string;
  name: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * The last gate before an account is destroyed.
 *
 * A plain confirm dialog is one mis-aimed click away from erasing somebody's
 * entire record, and this is the only button in the portal that cannot be
 * walked back — so it asks the operator to type the request reference. Copying
 * the code off the row is a small deliberate act, which is exactly the point.
 */
export default function PurgeAllDialog({
  open,
  code,
  name,
  busy,
  onConfirm,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toUpperCase() === code.toUpperCase();

  const close = () => {
    setTyped('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : close} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t('tech.accountDeletions.confirmAllTitle', { vars: { name: name || code } })}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>
            {t('tech.accountDeletions.confirmAllMessage', { vars: { code } })}
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={typed}
            disabled={busy}
            onChange={(event) => setTyped(event.target.value)}
            label={t('tech.accountDeletions.confirmAllPrompt', { vars: { code } })}
            slotProps={{
              htmlInput: { 'data-testid': 'purge-all-confirm-input' }
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>
          {t('tech.accountDeletions.close')}
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={onConfirm}
          disabled={!matches || busy}
          data-testid="purge-all-confirm"
        >
          {busy
            ? t('tech.accountDeletions.deletingAll')
            : t('tech.accountDeletions.confirmAllCta')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
