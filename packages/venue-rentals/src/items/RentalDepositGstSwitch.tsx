import { useState } from 'react';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError, SET_VENUE_RENTAL_DEPOSIT_GST_MUTATION } from '@duncit/utils';

const SET_DEPOSIT_GST: TypedDocumentNode<
  { setVenueRentalDepositGst: { venue_id: string; rental_deposit_gst: boolean } },
  { venue_id: string; charge_gst: boolean }
> = gql(SET_VENUE_RENTAL_DEPOSIT_GST_MUTATION);

interface Props {
  venueId: string;
  /** What the venue holds now. */
  chargeGst: boolean;
}

/**
 * Venues console only: whether this venue's refundable deposits are taxed with
 * the rent. A checkout freezes the answer, so a change prices the next booking.
 */
export default function RentalDepositGstSwitch({ venueId, chargeGst }: Readonly<Props>) {
  const { t } = useTranslation();
  const [value, setValue] = useState(chargeGst);
  const [save, { loading }] = useMutation(SET_DEPOSIT_GST);

  const change = async (next: boolean) => {
    setValue(next);
    try {
      const res = await save({ variables: { venue_id: venueId, charge_gst: next } });
      setValue(res.data?.setVenueRentalDepositGst.rental_deposit_gst ?? next);
      notifySuccess(t('venueRentals.items.depositGstSaved'));
    } catch (error) {
      // Put the switch back: the venue still holds what it held.
      setValue(!next);
      notifyError(parseApiError(error));
    }
  };

  return (
    <Stack spacing={0.25} data-testid="rental-deposit-gst">
      <FormControlLabel
        control={<Switch checked={value} disabled={loading} onChange={(_e, checked) => change(checked)} />}
        label={t('venueRentals.items.depositGst')}
      />
      <FormHelperText sx={{ mt: 0 }}>{t('venueRentals.items.depositGstHint')}</FormHelperText>
    </Stack>
  );
}
