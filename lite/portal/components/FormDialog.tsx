import type { FormEventHandler, ReactNode } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { usePortalT } from '../../shared/i18n';

interface Props {
  open: boolean;
  title: string;
  /** Wired to react-hook-form's `handleSubmit(...)`. */
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  busy?: boolean;
  /** Defaults to the shared Save copy. */
  submitLabel?: string;
  /** Extra leading action at the start of the footer (a Test button). */
  secondaryAction?: ReactNode;
  testId: string;
  children: ReactNode;
}

/** Every console form dialog: title, a `<form>`, Cancel + Save with the busy state. */
export function FormDialog({ open, title, onSubmit, onClose, busy = false, submitLabel, secondaryAction, testId, children }: Readonly<Props>) {
  const { t } = usePortalT();
  const titleId = `${testId}-title`;
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby={titleId} data-testid={testId}>
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle id={titleId}>{title}</DialogTitle>
        <DialogContent dividers>{children}</DialogContent>
        <DialogActions sx={{ justifyContent: secondaryAction ? 'space-between' : 'flex-end' }}>
          {secondaryAction}
          <span>
            <DuncitButton onClick={onClose} disabled={busy} data-testid={`${testId}-cancel`}>
              {t('lite.common.cancel')}
            </DuncitButton>
            <DuncitButton type="submit" variant="contained" loading={busy} data-testid={`${testId}-submit`} sx={{ ml: 1 }}>
              {submitLabel ?? t('lite.common.save')}
            </DuncitButton>
          </span>
        </DialogActions>
      </form>
    </Dialog>
  );
}
