import { useId } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useWebT } from '../../../../shared/i18n';
import { CancelEventForm } from './cancel-event.form';

interface CancelEventDialogProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

/** Cancelling an event asks for a reason first; the dialog frames the form. */
export function CancelEventDialog({ eventId, open, onClose, onCancelled }: Readonly<CancelEventDialogProps>) {
  const { t } = useWebT();
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="xs" data-testid="cancel-event-dialog">
      <DialogTitle id={titleId}>{t('liteWeb.manage.cancel.title')}</DialogTitle>
      <DialogContent>
        <CancelEventForm eventId={eventId} onCancelled={onCancelled} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
