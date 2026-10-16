import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Dialog, DialogContent, DialogContentText, DialogTitle, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError, rentalMoney, type RentalBookingRow } from '@duncit/utils';
import { MARK_RENTAL_REFUNDED } from '../documents';

interface Props {
  /** The rental whose refund Finance paid; null closes the dialog. */
  booking: RentalBookingRow | null;
  onClose: () => void;
  onRecorded: (booking: RentalBookingRow) => void;
}

interface Values {
  reference: string;
}

const TITLE_ID = 'rental-refund-title';

/** Finance records a rental refund it has paid back, with the reference that proves it. */
export default function RentalRefundDialog({ booking, onClose, onRecorded }: Readonly<Props>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [record, { loading }] = useMutation(MARK_RENTAL_REFUNDED);
  const schema = useMemo(
    () => z.object({ reference: z.string().trim().min(1, t('venueRentals.refundAction.referenceRequired')).max(120) }),
    [t]
  );
  const { control, handleSubmit, reset } = useForm<Values>({
    defaultValues: { reference: '' },
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
  });

  const close = () => {
    setApiError(null);
    reset({ reference: '' });
    onClose();
  };

  const submit = async (values: Values) => {
    if (!booking) return;
    setApiError(null);
    try {
      const res = await record({ variables: { id: booking.id, reference: values.reference.trim() } });
      const recorded = res.data?.markRentalRefunded;
      if (!recorded) return;
      notifySuccess(t('venueRentals.refundAction.saved'));
      onRecorded(recorded);
      close();
    } catch (error) {
      setApiError(parseApiError(error));
    }
  };

  return (
    <Dialog open={booking !== null} onClose={loading ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      {booking && (
        <>
          <DialogTitle id={TITLE_ID}>{t('venueRentals.refundAction.title', { vars: { name: booking.name } })}</DialogTitle>
          <DialogContent dividers>
            <form noValidate onSubmit={handleSubmit(submit)} data-testid="rental-refund-form">
              <Stack spacing={2.5}>
                <DialogContentText>
                  {t('venueRentals.refundAction.body', {
                    vars: { amount: rentalMoney(booking.currency_symbol, booking.refund_due), guest: booking.guest_name },
                  })}
                </DialogContentText>
                {apiError && <Alert severity="error">{apiError}</Alert>}
                <RhfTextField
                  control={control}
                  name="reference"
                  label={t('venueRentals.refundAction.reference')}
                  hint={t('venueRentals.refundAction.referenceHint')}
                  data-testid="rental-refund-reference"
                />
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  <DuncitButton onClick={close} disabled={loading}>
                    {t('venueRentals.refundAction.cancel')}
                  </DuncitButton>
                  <DuncitButton type="submit" variant="contained" loading={loading} disabled={loading}>
                    {t('venueRentals.refundAction.save')}
                  </DuncitButton>
                </Stack>
              </Stack>
            </form>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
