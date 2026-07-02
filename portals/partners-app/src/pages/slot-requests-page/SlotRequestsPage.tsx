import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Card, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { MY_VENUES } from '../register-venue-page/queries';
import { APPROVE_SLOT_REQUEST, DECLINE_SLOT_REQUEST, VENUE_SLOT_REQUESTS, type SlotRequestRow } from './queries';
import SlotRequestCard from './SlotRequestCard';

const ALL_VENUES = 'ALL';

export default function SlotRequestsPage() {
  const [venueId, setVenueId] = useState<string>(ALL_VENUES);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

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

  const handleApprove = async (slotId: string) => {
    try {
      await approve({ variables: { slot_id: slotId } });
      setFeedback({ severity: 'success', text: 'Booking approved — the pod is now live.' });
      await requestsQuery.refetch();
    } catch (err) {
      setFeedback({ severity: 'error', text: (err as Error).message });
    }
  };

  const handleDecline = async (slotId: string, reason: string) => {
    try {
      await decline({ variables: { slot_id: slotId, reason: reason || null } });
      setFeedback({ severity: 'success', text: 'Booking declined — the slot is open again.' });
      await requestsQuery.refetch();
    } catch (err) {
      setFeedback({ severity: 'error', text: (err as Error).message });
    }
  };

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }} variant="outlined">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.25}>
            <Typography variant="overline" color="text.secondary" fontWeight={800}>Partner tools · Venues</Typography>
            <Typography variant="h5" fontWeight={950}>Slot Requests</Typography>
            <Typography variant="body2" color="text.secondary">
              Hosts who want to run their pod at your venue. A pod only goes live after you approve its slot.
            </Typography>
          </Stack>
          <TextField
            select
            size="small"
            label="Venue"
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            helperText="Filter requests by venue"
            sx={{ minWidth: 220 }}
          >
            <MenuItem value={ALL_VENUES}>All venues</MenuItem>
            {venues.map((venue: any) => (
              <MenuItem key={venue.id} value={venue.id}>{venue.venue_name || 'Untitled venue'}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}
      {requestsQuery.error && <Alert severity="error">{requestsQuery.error.message}</Alert>}

      {requestsQuery.loading && !requestsQuery.data && (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={140} />
          <Skeleton variant="rounded" height={140} />
        </Stack>
      )}

      {!requestsQuery.loading && requests.length === 0 && (
        <Alert severity="info">No pending slot requests right now. New requests appear here the moment a host books one of your slots.</Alert>
      )}

      {requests.map((request) => (
        <SlotRequestCard
          key={request.slot_id}
          request={request}
          busy={busy}
          onApprove={handleApprove}
          onDecline={handleDecline}
        />
      ))}
    </Stack>
  );
}
