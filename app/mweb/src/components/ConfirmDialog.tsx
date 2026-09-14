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
import {
  DIALOG_ACTIONS_SX,
  DIALOG_CONTENT_SX,
  DIALOG_PILL_SX,
  DIALOG_TITLE_SX,
} from './dialog-styles';

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
  /** The dialog's own id; `-title`, `-cancel` and `-confirm` hang off it. */
  testId?: string;
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
  testId = 'confirm-dialog',
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
      data-testid={testId}
    >
      <DialogTitle id="confirm-dialog-title" data-testid={`${testId}-title`} sx={DIALOG_TITLE_SX}>
        {titleText}
      </DialogTitle>
      {message && (
        <DialogContent sx={DIALOG_CONTENT_SX}>
          {typeof message === 'string' ? (
            <DialogContentText sx={{ fontSize: 14 }}>{message}</DialogContentText>
          ) : (
            message
          )}
        </DialogContent>
      )}
      <DialogActions disableSpacing sx={DIALOG_ACTIONS_SX}>
        <DuncitButton
          data-testid={`${testId}-cancel`}
          variant="outlined"
          onClick={onClose}
          disabled={busy}
          sx={DIALOG_PILL_SX}
        >
          {cancelText}
        </DuncitButton>
        <DuncitButton
          data-testid={`${testId}-confirm`}
          onClick={onConfirm}
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={DIALOG_PILL_SX}
          autoFocus
        >
          {confirmText}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
