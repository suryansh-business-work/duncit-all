import { type Control, type FieldValues, type Path } from 'react-hook-form';
import { Stack, type SxProps, type Theme } from '@mui/material';
import RhfTextField from './RhfTextField';

/** Maps each postal-address part to a typed field name on the parent form. */
export interface AddressFieldNames<T extends FieldValues> {
  line1: Path<T>;
  line2: Path<T>;
  landmark: Path<T>;
  city: Path<T>;
  state: Path<T>;
  pincode: Path<T>;
  country: Path<T>;
}

interface Props<T extends FieldValues> {
  control: Control<T>;
  names: AddressFieldNames<T>;
  fieldSx?: SxProps<Theme>;
  size?: 'small' | 'medium';
  /** Shrink the labels (used by the compact account form). */
  shrinkLabels?: boolean;
  /** Show the required asterisk on line1/city/state/pincode (checkout). */
  required?: boolean;
  /** Format hint under the pincode field (varies by form's pincode rule). */
  pincodeHint?: string;
}

const PINCODE_INPUT = { inputMode: 'numeric' as const, maxLength: 10 };

/**
 * RHF-connected postal-address inputs (line1/line2/landmark/city/state/pincode/
 * country) reused by both the checkout billing section and the account "Main
 * address" section. The parent owns the field names via `names` so it works with
 * any form shape without clashing with sibling fields.
 */
export default function AddressFields<T extends FieldValues>({
  control,
  names,
  fieldSx,
  size = 'medium',
  shrinkLabels,
  required = false,
  pincodeHint,
}: Readonly<Props<T>>) {
  const labelProps = shrinkLabels ? { shrink: true } : undefined;
  return (
    <Stack spacing={1.5}>
      <RhfTextField control={control} name={names.line1} label="Address line 1" required={required} size={size} sx={fieldSx} InputLabelProps={labelProps} />
      <RhfTextField control={control} name={names.line2} label="Address line 2 (optional)" size={size} sx={fieldSx} InputLabelProps={labelProps} />
      <RhfTextField control={control} name={names.landmark} label="Landmark (optional)" size={size} sx={fieldSx} InputLabelProps={labelProps} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <RhfTextField control={control} name={names.city} label="City" required={required} size={size} sx={fieldSx} InputLabelProps={labelProps} />
        <RhfTextField control={control} name={names.state} label="State" required={required} size={size} sx={fieldSx} InputLabelProps={labelProps} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <RhfTextField control={control} name={names.pincode} label="Pincode" required={required} hint={pincodeHint} size={size} sx={fieldSx} InputLabelProps={labelProps} inputProps={PINCODE_INPUT} />
        <RhfTextField control={control} name={names.country} label="Country" size={size} sx={fieldSx} InputLabelProps={labelProps} />
      </Stack>
    </Stack>
  );
}
