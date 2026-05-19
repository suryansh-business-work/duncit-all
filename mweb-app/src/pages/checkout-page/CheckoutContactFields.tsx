import { Stack, TextField, type SxProps, type Theme } from '@mui/material';
import type { FormikProps } from 'formik';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import type { CheckoutForm } from './queries';

interface Props {
  formik: FormikProps<CheckoutForm>;
  fieldSx: SxProps<Theme>;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 15);

export default function CheckoutContactFields({ formik, fieldSx }: Props) {
  const { values, errors, touched, handleBlur, handleChange, setFieldValue } = formik;
  const fieldError = (key: keyof CheckoutForm) => {
    const value = values[key];
    const hasValue = typeof value === 'boolean' ? true : String(value ?? '').length > 0;
    return Boolean(errors[key] && (touched[key] || hasValue));
  };
  const helperText = (key: keyof CheckoutForm, fallback = ' ') => (fieldError(key) ? String(errors[key]) : fallback);

  return (
    <>
      <TextField
        label="Email"
        name="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={fieldError('email')}
        helperText={helperText('email')}
        fullWidth
        required
        sx={fieldSx}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="stretch">
        <PhoneExtensionField
          value={values.phone_extension}
          onChange={(dial) => setFieldValue('phone_extension', dial)}
          label="Code"
          size="medium"
          error={fieldError('phone_extension')}
          helperText={helperText('phone_extension')}
          sx={{ width: { xs: '100%', sm: 144 }, flexShrink: 0 }}
          textFieldSx={fieldSx}
        />
        <TextField
          label="Phone"
          name="phone_number"
          type="tel"
          value={values.phone_number}
          onChange={(event) => setFieldValue('phone_number', onlyDigits(event.target.value))}
          onBlur={handleBlur}
          error={fieldError('phone_number')}
          helperText={helperText('phone_number')}
          fullWidth
          required
          sx={fieldSx}
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 }}
        />
      </Stack>
      <TextField
        label="Billing address"
        name="billing_address"
        value={values.billing_address}
        onChange={handleChange}
        onBlur={handleBlur}
        error={fieldError('billing_address')}
        helperText={helperText('billing_address')}
        multiline
        minRows={3}
        fullWidth
        required
        sx={fieldSx}
      />
    </>
  );
}