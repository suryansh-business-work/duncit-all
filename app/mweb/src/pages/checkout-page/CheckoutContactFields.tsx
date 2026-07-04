import { Controller, type Control } from 'react-hook-form';
import { Stack, TextField, Typography, type SxProps, type Theme } from '@mui/material';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import RhfTextField from '../../forms/components/RhfTextField';
import BillingAddressSection from './BillingAddressSection';
import type { CheckoutForm } from './queries';
import type { PostalAddressParts } from './checkout';

interface Props {
  control: Control<CheckoutForm>;
  fieldSx: SxProps<Theme>;
  mainAddress: PostalAddressParts | null;
  hasMainAddress: boolean;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 15);

export default function CheckoutContactFields({ control, fieldSx, mainAddress, hasMainAddress }: Readonly<Props>) {
  return (
    <>
      <Stack spacing={1.5}>
        <Typography variant="overline" color="text.secondary" fontWeight={900}>
          Contact details
        </Typography>
        <RhfTextField control={control} name="full_name" label="Full name" sx={fieldSx} />
        <RhfTextField control={control} name="email" label="Email" required sx={fieldSx} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="stretch">
          <Controller
            control={control}
            name="phone_extension"
            render={({ field, fieldState }) => (
              <PhoneExtensionField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                label="Code"
                size="medium"
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? ' '}
                sx={{ width: { xs: '100%', sm: 144 }, flexShrink: 0 }}
                textFieldSx={fieldSx}
              />
            )}
          />
          <Controller
            control={control}
            name="phone_number"
            render={({ field, fieldState }) => (
              <TextField
                label="Phone"
                type="tel"
                value={field.value ?? ''}
                onChange={(event) => field.onChange(onlyDigits(event.target.value))}
                onBlur={field.onBlur}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? ' '}
                fullWidth
                required
                sx={fieldSx}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 }}
              />
            )}
          />
        </Stack>
      </Stack>
      <BillingAddressSection
        control={control}
        fieldSx={fieldSx}
        mainAddress={mainAddress}
        hasMainAddress={hasMainAddress}
      />
    </>
  );
}
