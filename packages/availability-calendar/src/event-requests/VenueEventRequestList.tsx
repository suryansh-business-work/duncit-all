import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import EventRequestRespondActions from './EventRequestRespondActions';
import OfferSummary from './OfferSummary';
import { MY_VENUE_EVENT_REQUESTS, type VenueEventRequest } from './queries';
import { EVENT_REQUEST_STATUS_COLOR, eventRequestStatusLabel } from './status';

const PAGE = 20;
/** The table API's page-size ceiling. */
const MAX_PAGE_SIZE = 100;

/**
 * Workshop & event requests to the owner's venues, as cards — the phone's
 * view of the console's request table, with the same Accept / Reject /
 * Counter offer actions. Newest first; "Show more" grows the page.
 */
export default function VenueEventRequestList() {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const [size, setSize] = useState(PAGE);
  const { data, loading, error, refetch } = useQuery<{ myReceivedEventRequestsTable: { total: number; rows: VenueEventRequest[] } }>(
    MY_VENUE_EVENT_REQUESTS,
    {
      variables: { query: { page: 1, page_size: size, sort_by: 'created_at', sort_dir: 'desc' } },
      fetchPolicy: 'cache-and-network',
    },
  );
  const page = data?.myReceivedEventRequestsTable;
  const rows = page?.rows ?? [];

  if (loading && !data) {
    return (
      <Stack spacing={1.5} aria-busy="true" aria-label={t('venuePricing.requests.loading')}>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={120} />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{t('venuePricing.requests.failed')}</Alert>;
  if (rows.length === 0) return <Alert severity="info">{t('publicPage.eventRequests.empty')}</Alert>;

  return (
    <Stack spacing={1.5} data-testid="venue-event-request-list">
      <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {rows.map((row) => (
          <Box component="li" key={row.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {row.requester_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {`${row.target_name} · ${fmt.formatDateTime(row.created_at)}`}
                </Typography>
              </Box>
              <Chip size="small" color={EVENT_REQUEST_STATUS_COLOR[row.status]} label={eventRequestStatusLabel(t, row.status)} />
            </Stack>
            {row.note && (
              <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-line' }}>
                {row.note}
              </Typography>
            )}
            <OfferSummary offer={row.offer} responseNote={row.response_note} />
            <Box sx={{ mt: 1.5 }}>
              <EventRequestRespondActions request={row} targetType="VENUE" onDone={() => refetch()} />
            </Box>
          </Box>
        ))}
      </Stack>
      {page && page.total > rows.length && size < MAX_PAGE_SIZE && (
        <DuncitButton variant="outlined" onClick={() => setSize((s) => Math.min(s + PAGE, MAX_PAGE_SIZE))} loading={loading}>
          {t('venuePricing.requests.showMore')}
        </DuncitButton>
      )}
    </Stack>
  );
}
