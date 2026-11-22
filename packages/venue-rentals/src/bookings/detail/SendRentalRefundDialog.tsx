import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import type { RentalBookingDetail } from '@duncit/utils';
import { SEND_RENTAL_REFUND } from '../../documents';
import SendRefundForm, { type SendRefundOutput } from '../send-refund';
import { bookingMoney } from './format';
import { useApiError, writeRentalDetail } from './useDetailMutation';

interface Props {
  open: boolean;
  detail: RentalBookingDetail;
  onClose: () => void;
  /** The server's detail once Razorpay has the refund, for the drawer and the board's row. */
  onSent: (detail: RentalBookingDetail) => void;
}

const TITLE_ID = 'send-rental-refund-title';

/**
 * Finance sends a refund that waited for review through Razorpay. Nothing reads
 * refunded until Razorpay confirms it; there is no way to mark one paid by hand.
 */
export default function SendRentalRefundDialog({ open, detail, onClose, onSent }: Readonly<Props>) {
  const { t } = useTranslation();
  const { apiError, clear, fail } = useApiError();
  const [send, { loading }] = useMutation(SEND_RENTAL_REFUND, {
    update: (cache, { data }) => writeRentalDetail(cache, data?.sendRentalRefund),
  });
  const { booking } = detail;
  const amount = bookingMoney(booking, booking.refund_outstanding ?? booking.refund_due);
  const guest = detail.guest.name || booking.guest_name;

  const close = () => {
    clear();
    onClose();
  };

  const submit = async (values: SendRefundOutput) => {
    clear();
    try {
      const res = await send({ variables: { id: booking.id, note: values.note } });
      const sent = res.data?.sendRentalRefund;
      if (!sent) return;
      notifySuccess(t('venueRentals.sendRefund.saved'));
      onSent(sent);
      close();
    } catch (error) {
      fail(error);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>{t('venueRentals.sendRefund.title', { vars: { name: booking.name } })}</DialogTitle>
      <DialogContent dividers>
        {open && (
          <SendRefundForm
            body={t('venueRentals.sendRefund.body', { vars: { amount, guest } })}
            busy={loading}
            errorMessage={apiError}
            onSubmit={submit}
            onCancel={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
