import { Controller, type Control } from 'react-hook-form';
import { MenuItem, TextField, type SxProps, type Theme } from '@mui/material';
import CheckoutContactFields from '../CheckoutContactFields';
import type { CheckoutForm } from '../queries';
import type { PostalAddressParts } from './checkout.types';

interface Props {
  control: Control<CheckoutForm>;
  fieldSx: SxProps<Theme>;
  dummyMode: boolean;
  selectMenuProps: Record<string, unknown>;
  mainAddress: PostalAddressParts | null;
  hasMainAddress: boolean;
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
}: Readonly<Props>) {
  return (
    <>
      <CheckoutContactFields
        control={control}
        fieldSx={fieldSx}
        mainAddress={mainAddress}
        hasMainAddress={hasMainAddress}
      />
      {dummyMode && (
        <Controller
          control={control}
          name="simulate_failure"
          render={({ field }) => (
            <TextField
              select
              label="Simulate"
              value={field.value ? 'fail' : 'success'}
              onChange={(e) => field.onChange(e.target.value === 'fail')}
              fullWidth
              helperText="Dummy gateway only"
              sx={fieldSx}
              SelectProps={{ MenuProps: selectMenuProps }}
            >
              <MenuItem value="success">Successful Payment</MenuItem>
              <MenuItem value="fail">Failed Payment</MenuItem>
            </TextField>
          )}
        />
      )}
    </>
  );
}
