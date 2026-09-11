import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import StudioPageHeader from '../../components/StudioPageHeader';
import PillChips from '../../components/club-admin/PillChips';
import SlotRequestCard from './SlotRequestCard';
import {
  ALL_VENUES,
  APPROVE_SLOT_REQUEST,
  DECLINE_SLOT_REQUEST,
  MY_VENUES,
  VENUE_SLOT_REQUESTS,
  type SlotRequestRow,
} from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Slot Requests, for a venue owner on their phone.
 *
 * The same queue the partner console shows, because it is the same decision: a
 * pod stays unlisted until its slot is approved, so a request sitting unread
 * is a pod that cannot sell a seat. Making that wait for a laptop was the gap.
 */
export default function VenueSlotRequestsPage() {
  const { t } = useTranslation();
  const [venueId, setVenueId] = useState<string>(ALL_VENUES);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null
  );

  const venuesQuery = useQuery<any>(MY_VENUES, { fetchPolicy: 'cache-first' });
  const requestsQuery = useQuery<any>(VENUE_SLOT_REQUESTS, {
    variables: { venue_id: venueId === ALL_VENUES ? null : venueId },
    fetchPolicy: 'cache-and-network',
  });
  const [approve, approveState] = useMutation<any>(APPROVE_SLOT_REQUEST);
  const [decline, declineState] = useMutation<any>(DECLINE_SLOT_REQUEST);

  const venues: { id: string; venue_name?: string }[] = venuesQuery.data?.myVenues ?? [];
  const requests: SlotRequestRow[] = requestsQuery.data?.venueSlotRequests ?? [];
  const venueOptions = useMemo(
    () => [
      { value: ALL_VENUES, label: t('mweb.venueSlotRequests.allVenues') },
      ...venues.map((venue) => ({
        value: venue.id,
        label: venue.venue_name || t('mweb.venueManagePage.untitledVenue'),
      })),
    ],
    [venues, t]
  );
  const busy = approveState.loading || declineState.loading;

  const decide = (run: Promise<unknown>, done: string) => {
    run
      .then(() => {
        setFeedback({ severity: 'success', text: done });
        return requestsQuery.refetch();
      })
      .catch((err: Error) => setFeedback({ severity: 'error', text: err.message }));
  };

  return (
    <Stack spacing={2.5} sx={{ p: 2 }}>
      <StudioPageHeader
        icon={<EventAvailableRoundedIcon fontSize="small" />}
        title={t('mweb.venueSlotRequests.slotRequests')}
      />

      {venues.length > 1 && (
        <PillChips label={t('mweb.common.venue')} options={venueOptions} value={venueId} onChange={setVenueId} />
      )}

      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}
      {requestsQuery.error && <Alert severity="error">{requestsQuery.error.message}</Alert>}

      {requestsQuery.loading && !requestsQuery.data && (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: '24px' }} />
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: '24px' }} />
        </Stack>
      )}

      {!requestsQuery.loading && requests.length === 0 && (
        <Alert severity="info">
          No pending slot requests right now. New ones appear here the moment a host books one of
          your slots.
        </Alert>
      )}

      {requests.map((request) => (
        <SlotRequestCard
          key={request.slot_id}
          request={request}
          busy={busy}
          onApprove={(slotId) =>
            decide(
              approve({ variables: { slot_id: slotId } }),
              'Booking approved — the pod is now live.'
            )
          }
          onDecline={(slotId, reason) =>
            decide(
              decline({ variables: { slot_id: slotId, reason: reason || null } }),
              'Booking declined — the slot is open again.'
            )
          }
        />
      ))}
    </Stack>
  );
}
