import { useId, type ReactNode } from 'react';
import { useFormContext, type FieldPath } from 'react-hook-form';
import { Dialog, DialogActions, DialogContent, DialogTitle, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../../shared/i18n';
import type { EventFormValues } from '../event.types';

interface SectionDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The fields this dialog edits: Done checks them and stays open while any is wrong. */
  fields: FieldPath<EventFormValues>[];
  children: ReactNode;
  testId: string;
}

/** A part of the event form that opens on its own (tickets, capacity, questions), full screen on a phone. */
export function SectionDialog({ open, onClose, title, fields, children, testId }: Readonly<SectionDialogProps>) {
  const { t } = useWebT();
  const { trigger } = useFormContext<EventFormValues>();
  const titleId = useId();
  const phone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const done = async () => {
    if (await trigger(fields)) onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm" aria-labelledby={titleId} data-testid={testId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        <DuncitButton
          variant="contained"
          onClick={() => {
            done().catch((error: unknown) => notifyError(parseApiError(error)));
          }}
          data-testid={`${testId}-done`}
        >
          {t('liteWeb.eventForm.done')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
