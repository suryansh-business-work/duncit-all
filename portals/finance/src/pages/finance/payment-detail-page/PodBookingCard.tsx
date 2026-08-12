import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import type { DateFormatter } from '@duncit/app-settings';
import type { PaymentPodBooking } from './queries';

interface Props {
  booking: PaymentPodBooking;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** The seat this payment bought: the pod, the membership it created and the
 * ticket that membership issued. A blank membership or ticket here is the same
 * failure the artifacts table flags — shown again in context. */
export default function PodBookingCard({ booking, formatDateTime }: Readonly<Props>) {
  const podDate = booking.pod_date_time ? formatDateTime(booking.pod_date_time) : EM_DASH;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 300, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Pod Booking
        </Typography>
        <Stack spacing={1} divider={<Divider flexItem />}>
          <InfoRow variant="split" label="Pod" value={booking.pod_title} />
          <InfoRow variant="split" label="Date" value={podDate} />
          <InfoRow variant="split" label="Seats" value={String(booking.seats)} />
          <InfoRow variant="split" label="Membership" value={booking.membership_id ?? EM_DASH} />
          <InfoRow variant="split" label="Membership status" value={booking.membership_status ?? EM_DASH} />
          <InfoRow variant="split" label="Ticket code" value={booking.ticket_code ?? EM_DASH} />
          <InfoRow variant="split" label="Ticket status" value={booking.ticket_status ?? EM_DASH} />
        </Stack>
      </CardContent>
    </Card>
  );
}
