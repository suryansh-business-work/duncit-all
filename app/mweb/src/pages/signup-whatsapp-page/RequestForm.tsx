import { Button, Stack, TextField } from '@mui/material';
import type { FormikProps } from 'formik';

interface RequestValues {
  phone_extension: string;
  phone_number: string;
}

interface Props {
  form: FormikProps<RequestValues>;
  loading: boolean;
  onSkip: () => void;
}

export default function RequestForm({ form, loading, onSkip }: Readonly<Props>) {
  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <Stack direction="row" spacing={1.5}>
        <TextField
          label="Code"
          name="phone_extension"
          value={form.values.phone_extension}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={form.touched.phone_extension && Boolean(form.errors.phone_extension)}
          helperText={form.touched.phone_extension && form.errors.phone_extension}
          sx={{ width: 100 }}
          size="small"
        />
        <TextField
          label="WhatsApp number"
          name="phone_number"
          value={form.values.phone_number}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={form.touched.phone_number && Boolean(form.errors.phone_number)}
          helperText={form.touched.phone_number && form.errors.phone_number}
          fullWidth
          size="small"
        />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button type="submit" variant="contained" fullWidth disabled={loading}>
          Send OTP
        </Button>
        <Button onClick={onSkip} variant="text">
          Skip
        </Button>
      </Stack>
    </form>
  );
}
