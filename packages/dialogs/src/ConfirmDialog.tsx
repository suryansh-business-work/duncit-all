import {
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useId, type ReactNode } from 'react';
import { useTranslation } from './i18n';

export type ConfirmColor = 'primary' | 'error' | 'warning' | 'success' | 'inherit';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Plain strings render inside DialogContentText; any other node renders as-is. */
  message?: ReactNode;
  /** Defaults to the shared `Confirm` copy in the reader's language. */
  confirmLabel?: string;
  /** Defaults to the shared `Cancel` copy in the reader's language. */
  cancelLabel?: string;
  /** Shorthand for confirmColor="error". Ignored when `confirmColor` is set. */
  destructive?: boolean;
  /** Explicit confirm-button color; wins over `destructive`. */
  confirmColor?: ConfirmColor;
  /** Disables both actions and backdrop close; shows a spinner on the confirm button. */
  busy?: boolean;
  /** Alias of `busy`. */
  loading?: boolean;
  /**
   * When set, the confirm button shows this label while busy (e.g. 'Working…')
   * instead of a spinner next to `confirmLabel`.
   */
  busyLabel?: string;
  /** Optional styling for the title, e.g. { fontWeight: 800 }. */
  titleSx?: SxProps<Theme>;
  onConfirm: () => void;
  onClose?: () => void;
  /** Alias of `onClose` (used when `onClose` is not provided). */
  onCancel?: () => void;
}

/** Generic MUI confirmation dialog — replaces window.confirm across portals (CLAUDE rule 12). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  confirmColor,
  busy,
  loading,
  busyLabel,
  titleSx,
  onConfirm,
  onClose,
  onCancel,
}: Readonly<ConfirmDialogProps>) {
  const { t } = useTranslation();
  const isBusy = Boolean(busy || loading);
  const close = onClose ?? onCancel;
  const fallbackColor: ConfirmColor = destructive ? 'error' : 'primary';
  const color = confirmColor ?? fallbackColor;
  const showBusyLabel = isBusy && busyLabel != null;
  const confirmContent = showBusyLabel ? busyLabel : (confirmLabel ?? t('shell.common.confirm'));
  const startIcon =
    isBusy && busyLabel == null ? <CircularProgress size={16} /> : undefined;
  // MUI names the dialog from DialogTitle; the body is its description, so a
  // screen reader hears what is being confirmed, not just the question.
  const messageId = useId();
  const describedBy = message == null ? undefined : messageId;
  // A destructive confirmation opens on the SAFE action (WCAG 3.3.4): an Enter
  // pressed on arrival cancels rather than deletes.
  const cancelFirst = color === 'error';

  return (
    <Dialog
      open={open}
      onClose={isBusy ? undefined : close}
      fullWidth
      maxWidth="xs"
      aria-describedby={describedBy}
    >
      <DialogTitle sx={titleSx}>{title}</DialogTitle>
      {message != null && (
        <DialogContent id={messageId}>
          {typeof message === 'string' ? (
            <DialogContentText>{message}</DialogContentText>
          ) : (
            message
          )}
        </DialogContent>
      )}
      <DialogActions>
        <DuncitButton
          onClick={close}
          disabled={isBusy}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the dialog the user just opened, onto its SAFE action (WCAG 2.4.3 / 3.3.4)
          autoFocus={cancelFirst}
          data-testid="confirm-dialog-cancel"
        >
          {cancelLabel ?? t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          color={color}
          startIcon={startIcon}
          onClick={onConfirm}
          disabled={isBusy}
          data-testid="confirm-dialog-confirm"
        >
          {confirmContent}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
