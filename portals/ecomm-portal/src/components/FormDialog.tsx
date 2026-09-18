import type { FormEventHandler, ReactNode } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface FormDialogProps {
  /** Ties the Save button in the actions row to the form inside the content. */
  formId: string;
  title: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * The frame every create/edit dialog in this console shares. A page mounts it
 * only while it is open, so each opening starts from fresh form values. While
 * a save is in flight the backdrop and Escape cannot dismiss it.
 */
export default function FormDialog({
  formId,
  title,
  busy,
  onClose,
  onSubmit,
  submitLabel,
  maxWidth = 'sm',
  children,
}: Readonly<FormDialogProps>) {
  const { t } = useTranslation();
  const titleId = `${formId}-title`;
  return (
    <Dialog open fullWidth maxWidth={maxWidth} onClose={busy ? undefined : onClose} aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent dividers>
        <form id={formId} noValidate onSubmit={onSubmit}>
          {children}
        </form>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" form={formId} variant="contained" loading={busy}>
          {submitLabel ?? t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
