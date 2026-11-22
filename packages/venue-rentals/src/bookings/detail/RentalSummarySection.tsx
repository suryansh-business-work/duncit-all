import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { RentalBookingRow } from '@duncit/utils';
import { RentalStatusChip } from '../rental-chips';
import DetailSection, { type DetailField } from './DetailSection';
import { bookingMoney, rentalChargeLine, when } from './format';

/** The item's photo and name, with how the rental stands. */
function RentalItemHeader({ booking }: Readonly<{ booking: RentalBookingRow }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
      {booking.image_url && (
        <Box
          component="img"
          src={booking.image_url}
          alt={booking.name}
          sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
        />
      )}
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
          {booking.name}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <RentalStatusChip status={booking.status} />
          {booking.auto_released && (
            <Typography variant="caption" color="text.secondary">
              {t('venueRentals.table.autoReleased')}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

/** What was rented, how it was charged, and how the rental stands. */
export default function RentalSummarySection({ booking }: Readonly<{ booking: RentalBookingRow }>) {
  const { t } = useTranslation();
  const fields: DetailField[] = [
    { key: 'quantity', label: t('venueRentals.detail.quantity'), value: booking.quantity },
    { key: 'rate', label: t('venueRentals.detail.rate'), value: bookingMoney(booking, booking.rate) },
    { key: 'duration', label: t('venueRentals.detail.duration'), value: rentalChargeLine(t, booking) },
    { key: 'booking-id', label: t('venueRentals.detail.bookingId'), value: booking.id },
    { key: 'order-ref', label: t('venueRentals.detail.orderRef'), value: booking.payment_ref },
    { key: 'booked-on', label: t('venueRentals.detail.bookedOn'), value: when(booking.created_at) },
    { key: 'closed-on', label: t('venueRentals.detail.closedOn'), value: when(booking.marked_at) },
  ];

  return (
    <DetailSection
      title={t('venueRentals.detail.summary')}
      testId="rental-detail-summary"
      lead={<RentalItemHeader booking={booking} />}
      fields={fields}
    />
  );
}
