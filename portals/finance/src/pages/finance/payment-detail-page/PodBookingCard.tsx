import { Divider, Stack } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import SectionBlock from './SectionBlock';
import type { PaymentPodBooking } from './queries';

interface Props {
  booking: PaymentPodBooking;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** The seat this payment bought: the pod, the membership it created and the
 * ticket that membership issued. A blank membership or ticket here is the same
 * failure the artifacts table flags — shown again in context. */
export default function PodBookingCard({ booking, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const podDate = booking.pod_date_time ? formatDateTime(booking.pod_date_time) : EM_DASH;

  return (
    <SectionBlock title={t('finance.payment.podBookingTitle')}>
      <Stack spacing={1} divider={<Divider flexItem />}>
        <InfoRow variant="split" label={t('finance.payment.pod')} value={booking.pod_title} />
        <InfoRow variant="split" label={t('finance.payment.podDate')} value={podDate} />
        <InfoRow variant="split" label={t('finance.payment.seats')} value={String(booking.seats)} />
        <InfoRow variant="split" label={t('finance.payment.membership')} value={booking.membership_id ?? EM_DASH} />
        <InfoRow variant="split" label={t('finance.payment.membershipStatus')} value={booking.membership_status ?? EM_DASH} />
        <InfoRow variant="split" label={t('finance.payment.ticketCode')} value={booking.ticket_code ?? EM_DASH} />
        <InfoRow variant="split" label={t('finance.payment.ticketStatus')} value={booking.ticket_status ?? EM_DASH} />
      </Stack>
    </SectionBlock>
  );
}
