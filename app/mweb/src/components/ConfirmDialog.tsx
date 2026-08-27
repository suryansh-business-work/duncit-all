import { ReactNode } from 'react';
import {
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  open: boolean;
  title?: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  busy,
  onConfirm,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Resolved here, not as parameter defaults: a default is evaluated before
  // any hook runs, so `t` would not exist yet.
  const titleText = title ?? t('mweb.confirm.areYouSure');
  const confirmText = confirmLabel ?? t('mweb.confirm.confirm');
  const cancelText = cancelLabel ?? t('mweb.common.cancel');
  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle id="confirm-dialog-title">{titleText}</DialogTitle>
      {message && (
        <DialogContent>
          {typeof message === 'string' ? (
            <DialogContentText>{message}</DialogContentText>
          ) : (
            message
          )}
        </DialogContent>
      )}
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy} sx={{ minHeight: 40 }}>
          {cancelText}
        </DuncitButton>
        <DuncitButton
          onClick={onConfirm}
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ minHeight: 40 }}
          autoFocus
        >
          {confirmText}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
