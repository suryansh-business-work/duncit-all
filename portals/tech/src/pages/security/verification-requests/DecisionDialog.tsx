import { useId } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DecisionFormBody, toDecisionInput, type DecisionForm } from './decision';
import type { RequestRow } from './queries';
import { useDecideRequest } from './useDecideRequest';

/** The request being decided, and which way. */
export interface DecisionTarget {
  request: RequestRow;
  approve: boolean;
}

interface OpenProps {
  target: DecisionTarget;
  onClose: () => void;
  onDecided: () => void;
}

function OpenDecisionDialog({ target, onClose, onDecided }: Readonly<OpenProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const { request, approve } = target;
  const { decide, busy } = useDecideRequest(() => {
    onDecided();
    onClose();
  });

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>
        {approve ? t('tech.verificationRequests.approveTitle') : t('tech.verificationRequests.rejectTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <DecisionFormBody
          request={request}
          approve={approve}
          busy={busy}
          onSubmit={(values: DecisionForm) => decide(toDecisionInput(request.id, approve, values))}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The small dialog an Approve or Reject opens.
 *
 * Mounted only while there is a request to decide, so the form starts blank for
 * every request — an always-mounted dialog keeps the note typed for the last one.
 */
export default function DecisionDialog({
  target,
  onClose,
  onDecided,
}: Readonly<{ target: DecisionTarget | null; onClose: () => void; onDecided: () => void }>) {
  if (!target) return null;
  return <OpenDecisionDialog target={target} onClose={onClose} onDecided={onDecided} />;
}
