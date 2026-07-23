import { useState } from 'react';
import { Controller, useFormState, useWatch, type Control } from 'react-hook-form';
import { Checkbox, FormControlLabel, Stack, type SxProps, type Theme } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import AddressFields, { type AddressFieldNames } from '../../forms/components/AddressFields';
import RhfTextField from '../../forms/components/RhfTextField';
import PodAccordion from '../../components/pod-details/PodAccordion';
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

/** Fields whose validation error should flag the Billing accordion as invalid. */
const BILLING_ERROR_KEYS = ['line1', 'line2', 'landmark', 'city', 'state', 'pincode', 'billing_email'] as const;

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
 * Billing address accordion (default expanded). Holds the "Same as my main
 * address" toggle over a read-only summary or the editable postal-address fields,
 * the optional billing email, and — only when the buyer has no saved main address
 * yet — a "Save this as my main address" checkbox. The accordion header turns red
 * and stays open whenever any billing field fails validation.
 */
export default function BillingAddressSection({ control, fieldSx, mainAddress, hasMainAddress }: Readonly<Props>) {
  const [open, setOpen] = useState(true);
  const sameAsMain = useWatch({ control, name: 'same_as_main' });
  const { errors } = useFormState({ control });
  const hasError = BILLING_ERROR_KEYS.some((key) => !!errors[key]);
  const showEditable = !sameAsMain;

  return (
    <PodAccordion
      id="billing-address"
      title="Billing address"
      icon={<HomeOutlinedIcon fontSize="small" />}
      expanded={open || hasError}
      onChange={setOpen}
      error={hasError}
    >
      <Stack spacing={1.5}>
        {hasMainAddress && <BillingCheckbox control={control} name="same_as_main" label="Same as my main address" />}
        {sameAsMain && mainAddress && <BillingSummary address={mainAddress} />}
        {showEditable && (
          <AddressFields
            control={control}
            names={ADDRESS_NAMES}
            fieldSx={fieldSx}
            required
            pincodeHint="4–10 digits"
          />
        )}
        <RhfTextField control={control} name="billing_email" label="Billing email (optional)" sx={fieldSx} />
        {!hasMainAddress && <BillingCheckbox control={control} name="save_as_main" label="Save this as my main address" />}
      </Stack>
    </PodAccordion>
  );
}
