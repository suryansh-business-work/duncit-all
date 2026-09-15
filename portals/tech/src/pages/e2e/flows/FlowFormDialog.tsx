import type { ReactNode } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  title: string;
  /** The id of the form inside, which the Save button submits. */
  formId: string;
  saving: boolean;
  onClose: () => void;
  maxWidth?: 'sm' | 'md';
  children: ReactNode;
}

/**
 * The dialog both flow editors open in. Rendered only while open, so the form
 * inside reads its defaults from the row that was just clicked.
 */
export default function FlowFormDialog({
  title,
  formId,
  saving,
  onClose,
  maxWidth = 'sm',
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={saving}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" form={formId} variant="contained" loading={saving}>
          {saving ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
