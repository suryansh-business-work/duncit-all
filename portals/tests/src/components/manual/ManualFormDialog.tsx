import { useId, type ReactNode } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  title: string;
  /** The id of the form inside, which the submit button submits. */
  formId: string;
  saving: boolean;
  onClose: () => void;
  /** Defaults to Save. */
  submitLabel?: string;
  /** A destructive submit (delete) is drawn in the error colour. */
  destructive?: boolean;
  children: ReactNode;
}

/**
 * The dialog the Manual Testing forms open in. Mount it only while open, so
 * the form inside reads its defaults from whatever was just clicked. It cannot
 * be dismissed mid-save.
 */
export function ManualFormDialog({
  title,
  formId,
  saving,
  onClose,
  submitLabel,
  destructive = false,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={saving}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form={formId}
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          loading={saving}
        >
          {submitLabel ?? t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
