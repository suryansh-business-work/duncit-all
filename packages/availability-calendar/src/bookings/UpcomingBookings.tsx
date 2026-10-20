import { useQuery } from '@apollo/client/react';
import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { rupees } from '../pricing/format';
import { MY_VENUE_UPCOMING_BOOKINGS, type UpcomingBooking } from './queries';

interface Props {
  /** One venue, or null for every venue the owner has. */
  venueId: string | null;
  limit?: number;
  /** Shows the venue's name on each row — useful when every venue is listed. */
  showVenue?: boolean;
}

/** The next confirmed bookings: pod, when, and exactly what the venue is paid. */
export default function UpcomingBookings({ venueId, limit = 5, showVenue = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const { data, loading, error } = useQuery<{ myVenueUpcomingBookings: UpcomingBooking[] }>(MY_VENUE_UPCOMING_BOOKINGS, {
    variables: { venue_id: venueId, limit },
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.myVenueUpcomingBookings ?? [];

  if (loading && !data) {
    return (
      <Stack spacing={1} aria-busy="true" aria-label={t('venuePricing.bookings.loading')}>
        <Skeleton variant="rounded" height={48} />
        <Skeleton variant="rounded" height={48} />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{t('venuePricing.bookings.failed')}</Alert>;
  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="upcoming-bookings-empty">
        {t('venuePricing.bookings.empty')}
      </Typography>
    );
  }

  return (
    <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }} data-testid="upcoming-bookings">
      {rows.map((row) => (
        <Box
          component="li"
          key={row.slot_id}
          sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 800 }}>
              {row.pod_title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {`${fmt.formatDateTime(row.start_at)} – ${fmt.formatTime(row.end_at)}`}
              {showVenue || row.space_label ? ` · ${[showVenue ? row.venue_name : '', row.space_label].filter(Boolean).join(' · ')}` : ''}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main' }}>
              {rupees(row.venue_payout)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('venuePricing.bookings.payout')}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
