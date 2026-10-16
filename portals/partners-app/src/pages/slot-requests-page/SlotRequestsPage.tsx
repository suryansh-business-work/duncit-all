import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Card, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { MY_VENUES } from '../register-venue-page/queries';
import {
  APPROVE_SLOT_REQUEST,
  DECLINE_SLOT_REQUEST,
  VENUE_DECIDE_POD_SERIES,
  VENUE_SLOT_REQUESTS,
  type SlotRequestRow,
} from './queries';
import { GroupedSlotRequests, shellSeriesRequestLabels } from '@duncit/ui';
import { formatDateTime } from '@duncit/app-settings';
import SlotRequestCard from './SlotRequestCard';
import { useTranslation } from '@duncit/shell';
import { ALL_VENUES, useVenueFilter } from '../../components/venue/useSelectedVenue';

export default function SlotRequestsPage() {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  const venuesQuery = useQuery<any>(MY_VENUES, { fetchPolicy: 'cache-first' });
  const venues = venuesQuery.data?.myVenues ?? [];
  // Opens on the venue picked last on any venue page; "All venues" stays a choice.
  const filter = useVenueFilter(venues);
  const requestsQuery = useQuery<any>(VENUE_SLOT_REQUESTS, {
    variables: { venue_id: filter.venueIdOrNull },
    fetchPolicy: 'cache-and-network',
  });
  const [approve, approveState] = useMutation<any>(APPROVE_SLOT_REQUEST);
  const [decline, declineState] = useMutation<any>(DECLINE_SLOT_REQUEST);
  const [decideSeriesMut, decideSeriesState] = useMutation<{
    venueDecidePodSeries: { decided: number; failed: number };
  }>(VENUE_DECIDE_POD_SERIES);
  const seriesLabels = useMemo(() => shellSeriesRequestLabels(t), [t]);

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

  /** Every pending date of a series at once; says how many could not be answered. */
  const decideSeries = async (seriesId: string, approveAll: boolean, reason?: string) => {
    try {
      const res = await decideSeriesMut({ variables: { series_id: seriesId, approve: approveAll, reason: reason || null } });
      const result = res.data?.venueDecidePodSeries;
      const count = result?.decided ?? 0;
      const text = approveAll
        ? t('shell.podSeries.acceptedAll', { vars: { count } })
        : t('shell.podSeries.declinedAll', { vars: { count } });
      const failed = result?.failed ? ` ${t('shell.podSeries.someFailed', { vars: { count: result.failed } })}` : '';
      setFeedback({ severity: 'success', text: text + failed });
      await requestsQuery.refetch();
    } catch (err) {
      setFeedback({ severity: 'error', text: (err as Error).message });
    }
  };

  const card = (request: SlotRequestRow) => (
    <SlotRequestCard
      key={request.slot_id}
      request={request}
      busy={busy}
      onApprove={handleApprove}
      onDecline={handleDecline}
    />
  );

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }} variant="outlined">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{
          alignItems: { md: 'center' }
        }}>
          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.25}>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 800
              }}>{t('partners.common.partnerToolsVenues')}</Typography>
            <Typography variant="h5" component="h1" sx={{
              fontWeight: 950
            }}>{t('partners.slotRequestsPage.slotRequests')}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Hosts who want to run their pod at your venue. A pod only goes live after you approve its slot.
            </Typography>
          </Stack>
          <TextField
            select
            size="small"
            label={t('partners.common.venue')}
            value={filter.value}
            onChange={(e) => filter.change(e.target.value)}
            helperText={t('partners.slotRequestsPage.filterRequestsByVenue')}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value={ALL_VENUES}>{t('partners.common.allVenues')}</MenuItem>
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
        <Stack spacing={1.5} aria-busy="true">
          <Skeleton variant="rounded" height={140} />
          <Skeleton variant="rounded" height={140} />
        </Stack>
      )}

      {!requestsQuery.loading && requests.length === 0 && (
        <Alert severity="info">{t('partners.slotRequestsPage.noPendingSlotRequestsRightNow')}</Alert>
      )}

      <GroupedSlotRequests
        requests={requests}
        busy={busy || decideSeriesState.loading}
        labels={seriesLabels}
        formatWhen={formatDateTime}
        renderRow={card}
        onDecideSeries={decideSeries}
      />
    </Stack>
  );
}
