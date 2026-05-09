import { Button, Stack, TextField } from '@mui/material';
import type { FormikProps } from 'formik';

interface VerifyValues {
  otp: string;
}

interface Props {
  form: FormikProps<VerifyValues>;
  loading: boolean;
  onChangeNumber: () => void;
  onSkip: () => void;
}

export default function VerifyForm({ form, loading, onChangeNumber, onSkip }: Props) {
  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <TextField
        label="Enter OTP"
        name="otp"
        value={form.values.otp}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        error={form.touched.otp && Boolean(form.errors.otp)}
        helperText={form.touched.otp && form.errors.otp}
        fullWidth
        size="small"
        inputProps={{ inputMode: 'numeric', maxLength: 8 }}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button type="submit" variant="contained" fullWidth disabled={loading}>
          Verify & continue
        </Button>
        <Button onClick={onChangeNumber} variant="text">
          Change number
        </Button>
      </Stack>
      <Button onClick={onSkip} fullWidth sx={{ mt: 1 }}>
        Skip for now
      </Button>
    </form>
  );
}
