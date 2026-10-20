import { useState } from 'react';
import { Stack } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { EventRequestOfferView, EventRequestStatus } from './queries';
import RespondDialog from './RespondDialog';
import type { RespondChoice } from './respond-form';
import { isAnswerable } from './status';

export interface RespondableRequest {
  id: string;
  status: EventRequestStatus;
  /** The venue (VENUE request) — its pricing module prices a counter offer. */
  target_id: string;
  requester_name: string;
  offer?: EventRequestOfferView | null;
}

interface Props {
  request: RespondableRequest;
  /** VENUE requests get a priced counter offer; a host's offer carries only a time. */
  targetType: 'VENUE' | 'HOST';
  onDone: () => Promise<unknown> | void;
}

/** Accept / Reject / Counter offer on one request; nothing once it is closed. */
export default function EventRequestRespondActions({ request, targetType, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<RespondChoice | null>(null);
  if (!isAnswerable(request.status)) return null;

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <DuncitButton
          size="small"
          variant="contained"
          startIcon={<CheckIcon />}
          onClick={() => setChoice('ACCEPT')}
          data-testid={`event-request-accept-${request.id}`}
        >
          {t('venuePricing.respond.accept')}
        </DuncitButton>
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<EventRepeatIcon />}
          onClick={() => setChoice('COUNTER')}
          data-testid={`event-request-counter-${request.id}`}
        >
          {t('venuePricing.respond.counter')}
        </DuncitButton>
        <DuncitButton
          size="small"
          color="error"
          startIcon={<CloseIcon />}
          onClick={() => setChoice('REJECT')}
          data-testid={`event-request-reject-${request.id}`}
        >
          {t('venuePricing.respond.reject')}
        </DuncitButton>
      </Stack>
      <RespondDialog
        requestId={request.id}
        choice={choice}
        venueId={targetType === 'VENUE' ? request.target_id : null}
        requesterName={request.requester_name}
        offer={request.offer ?? null}
        onClose={() => setChoice(null)}
        onDone={onDone}
      />
    </>
  );
}
