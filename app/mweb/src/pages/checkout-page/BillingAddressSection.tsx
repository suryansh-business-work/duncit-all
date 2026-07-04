import { Controller, useWatch, type Control } from 'react-hook-form';
import { Checkbox, FormControlLabel, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import AddressFields, { type AddressFieldNames } from '../../forms/components/AddressFields';
import RhfTextField from '../../forms/components/RhfTextField';
import BillingSummary from './BillingSummary';
import type { CheckoutForm } from './queries';
import type { PostalAddressParts } from './checkout';

const ADDRESS_NAMES: AddressFieldNames<CheckoutForm> = {
  line1: 'line1',
  line2: 'line2',
  landmark: 'landmark',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  country: 'country',
};

interface CheckboxProps {
  control: Control<CheckoutForm>;
  name: 'same_as_main' | 'save_as_main';
  label: string;
}

/** RHF-bound checkbox — hoisted to module scope (S6478). */
function BillingCheckbox({ control, name, label }: Readonly<CheckboxProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControlLabel
          control={
            <Checkbox
              checked={!!field.value}
              onChange={(event) => field.onChange(event.target.checked)}
              inputProps={{ 'aria-label': label }}
            />
          }
          label={label}
        />
      )}
    />
  );
}

interface Props {
  control: Control<CheckoutForm>;
  fieldSx: SxProps<Theme>;
  mainAddress: PostalAddressParts | null;
  hasMainAddress: boolean;
}

/**
 * Billing address section — a "Same as my main address" toggle over a read-only
 * summary or the editable postal-address fields, plus an optional separate
 * billing email and GSTIN. When the fields are editable, a "Save this as my main
 * address" checkbox writes them back to the profile on pay.
 */
export default function BillingAddressSection({ control, fieldSx, mainAddress, hasMainAddress }: Readonly<Props>) {
  const sameAsMain = useWatch({ control, name: 'same_as_main' });
  const showEditable = !sameAsMain;
  return (
    <Stack spacing={1.5}>
      <Typography variant="overline" color="text.secondary" fontWeight={900}>
        Billing address
      </Typography>
      {hasMainAddress && <BillingCheckbox control={control} name="same_as_main" label="Same as my main address" />}
      {sameAsMain && mainAddress && <BillingSummary address={mainAddress} />}
      {showEditable && <AddressFields control={control} names={ADDRESS_NAMES} fieldSx={fieldSx} required />}
      {showEditable && <BillingCheckbox control={control} name="save_as_main" label="Save this as my main address" />}
      <RhfTextField control={control} name="billing_email" label="Billing email (optional)" sx={fieldSx} />
      <RhfTextField control={control} name="gstin" label="GSTIN (for business invoice)" sx={fieldSx} />
    </Stack>
  );
}
