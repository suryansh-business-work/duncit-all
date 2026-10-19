import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError, type RentalBookingRow } from '@duncit/utils';
import { MARK_RENTAL_BOOKING, PUBLIC_RENTAL_SETTINGS } from '../documents';
import MarkRentalForm, { type MarkRentalOutput } from './mark-rental';

interface Props {
  /** The rental being marked; null closes the dialog. */
  booking: RentalBookingRow | null;
  onClose: () => void;
  /** The server's copy after the mark, with the refund and the venue's share frozen. */
  onMarked: (booking: RentalBookingRow) => void;
}

const TITLE_ID = 'mark-rental-title';

/**
 * Close a rental the venue handed out. The server closes it only from BOOKED,
 * so a second device marking the same item gets a clear refusal here instead
 * of settling it twice.
 */
export default function MarkRentalDialog({ booking, onClose, onMarked }: Readonly<Props>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [mark, { loading }] = useMutation(MARK_RENTAL_BOOKING);
  // Finance's rule decides whether the venue hands the deposit back; refundable until it says otherwise.
  const settings = useQuery(PUBLIC_RENTAL_SETTINGS, { skip: booking === null, fetchPolicy: 'cache-first' });
  const depositRefundable = settings.data?.publicRentalSettings.deposit_refundable !== false;

  const close = () => {
    setApiError(null);
    onClose();
  };

  const submit = async (values: MarkRentalOutput) => {
    if (!booking) return;
    setApiError(null);
    const damaged = values.outcome === 'DAMAGED';
    try {
      const res = await mark({
        variables: {
          id: booking.id,
          input: {
            outcome: values.outcome,
            damage_claim: damaged ? Number(values.damage_claim) : null,
            note: damaged ? values.note : null,
          },
        },
      });
      const marked = res.data?.markRentalBooking;
      if (!marked) return;
      notifySuccess(t('venueRentals.mark.saved'));
      onMarked(marked);
      close();
    } catch (error) {
      setApiError(parseApiError(error));
    }
  };

  return (
    <Dialog open={booking !== null} onClose={loading ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      {booking && (
        <>
          <DialogTitle id={TITLE_ID}>{t('venueRentals.mark.title', { vars: { name: booking.name } })}</DialogTitle>
          <DialogContent dividers>
            <MarkRentalForm
              key={booking.id}
              booking={booking}
              depositRefundable={depositRefundable}
              busy={loading}
              errorMessage={apiError}
              onSubmit={submit}
              onCancel={close}
            />
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
