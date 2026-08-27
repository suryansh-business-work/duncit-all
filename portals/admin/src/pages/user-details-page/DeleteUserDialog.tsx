import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteUserDialog({ open, busy, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('admin.users.deleteTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          This action permanently removes the account. It cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton color="error" variant="contained" onClick={onConfirm} disabled={busy}>
          Delete User
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
