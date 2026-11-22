import { Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { canSendRentalRefund, type RentalBookingDetail } from '@duncit/utils';
import { RentalPaymentSection, RentalRefundsSection } from './RentalGatewaySections';
import { RentalMoneySection, RentalRefundSection } from './RentalMoneySections';
import { RentalGuestSection, RentalPodSection, RentalVenueSection } from './RentalPartiesSections';
import RentalProofsSection from './RentalProofsSection';
import RentalSummarySection from './RentalSummarySection';
import RentalTimelineSection from './RentalTimelineSection';
import type { RentalDetailLinks } from './types';

interface Props {
  detail: RentalBookingDetail;
  links: RentalDetailLinks;
  onAddProof: () => void;
  onSendRefund: () => void;
}

/**
 * One rental, whole. What each part shows is the server's view: Finance's
 * includes emails, Razorpay ids and errors and the payment; the venue's does
 * not. The UI also hides them for the venue, so a stray field never shows.
 */
export default function RentalDetailBody({ detail, links, onAddProof, onSendRefund }: Readonly<Props>) {
  const { t } = useTranslation();
  const finance = detail.viewer === 'FINANCE';
  const { booking } = detail;
  const sendRefund =
    finance && canSendRentalRefund(booking) ? (
      <DuncitButton variant="contained" startIcon={<SendIcon />} onClick={onSendRefund} data-testid="rental-detail-send-refund">
        {t('venueRentals.sendRefund.action')}
      </DuncitButton>
    ) : null;

  return (
    <Stack spacing={2.5} data-testid="rental-detail-body">
      <RentalSummarySection booking={booking} />
      <RentalGuestSection detail={detail} finance={finance} links={links} />
      <RentalPodSection detail={detail} links={links} />
      <RentalVenueSection detail={detail} finance={finance} />
      <RentalMoneySection booking={booking} />
      <RentalRefundSection booking={booking} action={sendRefund} />
      <RentalRefundsSection refunds={detail.refunds} money={booking} finance={finance} />
      {finance && detail.payment && <RentalPaymentSection payment={detail.payment} money={booking} />}
      <RentalProofsSection proofs={detail.proofs} onAdd={onAddProof} />
      <RentalTimelineSection events={detail.events} money={booking} />
    </Stack>
  );
}
