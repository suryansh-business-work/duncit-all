import { useState } from 'react';
import { Alert, Stack } from '@mui/material';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { DuncitButton } from '@duncit/buttons';
import RescheduleMeetingDialog from './RescheduleMeetingDialog';
import CancelMeetingDialog from './CancelMeetingDialog';

interface Props {
  kind: string;
  /** Booked slot (scheduled_at, else requested_at) shown in the reschedule dialog. */
  bookedAt: string | null;
  /** Times the user has already rescheduled — reschedule is one-time. */
  rescheduleCount: number;
  /** Called after a successful reschedule/cancel so the page can refetch. */
  onChanged: () => void;
}

/** Reschedule / cancel actions for an Earn card with a pending onboarding meeting. */
export default function EarnMeetingActions({ kind, bookedAt, rescheduleCount, onChanged }: Readonly<Props>) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const canReschedule = rescheduleCount < 1;

  const afterReschedule = () => { setRescheduleOpen(false); onChanged(); };
  const afterCancel = () => { setCancelOpen(false); onChanged(); };

  return (
    <Stack spacing={1} sx={{ px: 2, pb: 2 }}>
      <Stack direction="row" spacing={1}>
        {canReschedule && (
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={<EventRepeatIcon />}
            onClick={() => setRescheduleOpen(true)}
            sx={{ borderRadius: 999, fontWeight: 600 }}
          >
            Reschedule meeting
          </DuncitButton>
        )}
        <DuncitButton
          size="small"
          color="error"
          variant="outlined"
          startIcon={<EventBusyIcon />}
          onClick={() => setCancelOpen(true)}
          sx={{ borderRadius: 999, fontWeight: 600 }}
        >
          Cancel meeting
        </DuncitButton>
      </Stack>
      {!canReschedule && (
        <Alert severity="info" sx={{ py: 0 }}>
          You have already used your one-time reschedule option.
        </Alert>
      )}

      <RescheduleMeetingDialog
        open={rescheduleOpen}
        kind={kind}
        bookedAt={bookedAt}
        onClose={() => setRescheduleOpen(false)}
        onDone={afterReschedule}
      />
      <CancelMeetingDialog
        open={cancelOpen}
        kind={kind}
        onClose={() => setCancelOpen(false)}
        onDone={afterCancel}
      />
    </Stack>
  );
}
