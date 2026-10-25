import { useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { offerTermsLabel, rupees } from '@duncit/availability-calendar';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import SectionCard from '../SectionCard';
import BookingTermsAsk, { bookingPendingLabel } from './BookingTermsAsk';
import { ADMIN_VENUE_BOOKING_TERMS } from './queries';

/**
 * What each booking at this venue is worth — agreed once booked, still on the
 * table while the host and the venue negotiate: the venue's amount (paid in
 * full), Duncit's commission on top, and what the host pays — with the ask
 * behind it (guests, what the venue provides, the note), the round it is on,
 * whose move it is and when the answer is due. Read-only.
 */
export default function VenueBookingTermsCard({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const { data, loading, error } = useQuery(ADMIN_VENUE_BOOKING_TERMS, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.adminVenueBookingTerms ?? [];

  return (
    <SectionCard icon={<PaymentsOutlinedIcon color="primary" />} title={t('availability.offers.agreedTerms')}>
      {loading && !data && <Skeleton variant="rounded" height={96} />}
      {error && <Alert severity="error">{t('availability.offers.loadFailed')}</Alert>}
      {!loading && !error && rows.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('availability.offers.empty')}
        </Typography>
      )}
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }} data-testid="venue-booking-terms">
        {rows.map((row) => (
          <Box component="li" key={row.slot_id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {row.pod_title || '—'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {`${fmt.formatDateTime(row.start_at)} – ${fmt.formatTime(row.end_at)} · ${offerTermsLabel(t, row.model, row.rate)}`}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  {[
                    `${t('availability.offers.venuePayout')} ${rupees(row.venue_payout)}`,
                    `${t('availability.offers.duncitFee')} ${rupees(row.platform_fee)}`,
                    `${t('availability.offers.hostTotal')} ${rupees(row.total)}`,
                  ].join(' · ')}
                </Typography>
                <BookingTermsAsk row={row} />
              </Box>
              {row.status === 'PENDING' && <Chip size="small" color="warning" label={bookingPendingLabel(t, row.awaiting)} />}
            </Stack>
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );
}
