import { Controller, type Control } from 'react-hook-form';
import { MenuItem, TextField, type SxProps, type Theme } from '@mui/material';
import CheckoutContactFields from '../CheckoutContactFields';
import type { CheckoutContact, CheckoutForm } from '../queries';
import type { PostalAddressParts } from './checkout.types';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  control: Control<CheckoutForm>;
  fieldSx: SxProps<Theme>;
  dummyMode: boolean;
  selectMenuProps: Record<string, unknown>;
  mainAddress: PostalAddressParts | null;
  hasMainAddress: boolean;
  contact: CheckoutContact | null;
  contactLoading: boolean;
  addressRequired: boolean;
}

/**
 * Checkout form fields — RHF + Zod. Renders the contact + billing-address
 * inputs and, on the dummy gateway, the success/fail simulator select.
 */
export default function CheckoutFields({
  control,
  fieldSx,
  dummyMode,
  selectMenuProps,
  mainAddress,
  hasMainAddress,
  contact,
  contactLoading,
  addressRequired,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <CheckoutContactFields
        control={control}
        fieldSx={fieldSx}
        mainAddress={mainAddress}
        hasMainAddress={hasMainAddress}
        contact={contact}
        contactLoading={contactLoading}
        addressRequired={addressRequired}
      />
      {dummyMode && (
        <Controller
          control={control}
          name="simulate_failure"
          render={({ field }) => (
            <TextField
              select
              label={t('mweb.checkout.simulate')}
              value={field.value ? 'fail' : 'success'}
              onChange={(e) => field.onChange(e.target.value === 'fail')}
              fullWidth
              helperText={t('mweb.checkout.dummyGatewayOnly')}
              sx={fieldSx}
              SelectProps={{ MenuProps: selectMenuProps }}
            >
              <MenuItem value="success">{t('mweb.checkout.successfulPayment')}</MenuItem>
              <MenuItem value="fail">{t('mweb.checkout.failedPayment')}</MenuItem>
            </TextField>
          )}
        />
      )}
    </>
  );
}
