import { ReactNode } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

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
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  busy,
  onConfirm,
  onClose,
}: Readonly<Props>) {
  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
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
        <Button onClick={onClose} disabled={busy} sx={{ minHeight: 40 }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ minHeight: 40 }}
          autoFocus
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
