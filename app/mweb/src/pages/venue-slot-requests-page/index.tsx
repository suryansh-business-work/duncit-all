import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import SlotRequestCard from './SlotRequestCard';
import {
  ALL_VENUES,
  APPROVE_SLOT_REQUEST,
  DECLINE_SLOT_REQUEST,
  MY_VENUES,
  VENUE_SLOT_REQUESTS,
  type SlotRequestRow,
} from './queries';

/**
 * Slot Requests, for a venue owner on their phone.
 *
 * The same queue the partner console shows, because it is the same decision: a
 * pod stays unlisted until its slot is approved, so a request sitting unread
 * is a pod that cannot sell a seat. Making that wait for a laptop was the gap.
 */
export default function VenueSlotRequestsPage() {
  const [venueId, setVenueId] = useState<string>(ALL_VENUES);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null
  );

  const venuesQuery = useQuery(MY_VENUES, { fetchPolicy: 'cache-first' });
  const requestsQuery = useQuery(VENUE_SLOT_REQUESTS, {
    variables: { venue_id: venueId === ALL_VENUES ? null : venueId },
    fetchPolicy: 'cache-and-network',
  });
  const [approve, approveState] = useMutation(APPROVE_SLOT_REQUEST);
  const [decline, declineState] = useMutation(DECLINE_SLOT_REQUEST);

  const venues = venuesQuery.data?.myVenues ?? [];
  const requests: SlotRequestRow[] = requestsQuery.data?.venueSlotRequests ?? [];
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
    <Stack spacing={2} sx={{ p: 2 }}>
      <Stack spacing={0.25}>
        <Typography variant="h6" fontWeight={800}>
          Slot Requests
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hosts who want to run their pod at your venue. A pod only goes live after you approve its
          slot.
        </Typography>
      </Stack>

      {venues.length > 1 && (
        <TextField
          select
          size="small"
          label="Venue"
          value={venueId}
          onChange={(event) => setVenueId(event.target.value)}
        >
          <MenuItem value={ALL_VENUES}>All venues</MenuItem>
          {venues.map((venue: { id: string; venue_name?: string }) => (
            <MenuItem key={venue.id} value={venue.id}>
              {venue.venue_name || 'Untitled venue'}
            </MenuItem>
          ))}
        </TextField>
      )}

      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}
      {requestsQuery.error && <Alert severity="error">{requestsQuery.error.message}</Alert>}

      {requestsQuery.loading && !requestsQuery.data && (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={200} />
          <Skeleton variant="rounded" height={200} />
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
