import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
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
import { useSelectedVenue } from '../../hooks/useSelectedVenue';

/**
 * The slot requests still pending from before instant booking, on the
 * Workshop & Event Requests page's "Past slot requests" tab.
 *
 * Nothing creates new ones any more, but a leftover request keeps the same
 * approve / decline the partner console offers until it expires — a pod
 * stays unlisted until its slot is answered.
 */
export default function VenueSlotRequestsPage() {
  const { t } = useTranslation();
  // null until the owner taps a chip: the page opens on the venue the Venue
  // Options page selected, and "All venues" stays one tap away.
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null
  );

  const venuesQuery = useQuery<any>(MY_VENUES, { fetchPolicy: 'cache-first' });
  const venues: { id: string; venue_name?: string }[] = venuesQuery.data?.myVenues ?? [];
  const selected = useSelectedVenue(venues);
  const venueId = chosenId ?? selected.venueId ?? ALL_VENUES;
  const requestsQuery = useQuery<any>(VENUE_SLOT_REQUESTS, {
    variables: { venue_id: venueId === ALL_VENUES ? null : venueId },
    // Wait for the venue list, or the page would read every venue's queue
    // first and then the selected one's.
    skip: venuesQuery.loading && !venuesQuery.data,
    fetchPolicy: 'cache-and-network',
  });
  const [approve, approveState] = useMutation<any>(APPROVE_SLOT_REQUEST);
  const [decline, declineState] = useMutation<any>(DECLINE_SLOT_REQUEST);

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

  const card = (request: SlotRequestRow) => (
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
  );

  return (
    <Stack spacing={2.5} data-testid="venue-slot-requests-page">

      {venues.length > 1 && (
        <PillChips
          label={t('mweb.common.venue')}
          options={venueOptions}
          value={venueId}
          onChange={(id) => {
            setChosenId(id);
            // A specific venue is remembered for every venue page; All is not
            // a venue, so it stays this page's own choice.
            if (id !== ALL_VENUES) selected.selectVenue(id);
          }}
        />
      )}

      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)} data-testid="slot-request-feedback">
          {feedback.text}
        </Alert>
      )}
      {requestsQuery.error && <Alert severity="error" data-testid="venue-slot-requests-page-error">{requestsQuery.error.message}</Alert>}

      {requestsQuery.loading && !requestsQuery.data && (
        <Stack spacing={1.5} data-testid="venue-slot-requests-page-loading">
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: '24px' }} />
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: '24px' }} />
        </Stack>
      )}


      {requests.map(card)}
    </Stack>
  );
}

