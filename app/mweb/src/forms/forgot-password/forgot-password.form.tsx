import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, FormHelperText, InputAdornment, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import RhfTextField from '../components/RhfTextField';
import {
  forgotPasswordDefaults,
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from './forgot-password.types';

interface Props {
  loading?: boolean;
  initialValues?: ForgotPasswordValues;
  errorMessage?: string | null;
  /** Server-side validation shown directly below the email field (e.g. "Unregistered User"). */
  emailError?: string | null;
  onSubmit: (values: ForgotPasswordValues) => Promise<void> | void;
}

export default function ForgotPasswordForm({ loading, initialValues, errorMessage, emailError, onSubmit }: Readonly<Props>) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    defaultValues: initialValues ?? forgotPasswordDefaults,
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="email"
          type="email"
          label="Email"
          placeholder="hello@duncit.com"
          autoComplete="email"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        {emailError && (
          <FormHelperText error role="alert" sx={{ mt: -1, mx: 1.75 }}>
            {emailError}
          </FormHelperText>
        )}
        <Button
          type="submit"
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          disabled={loading}
          sx={{ borderRadius: 2, py: 1.25, fontWeight: 700, textTransform: 'none' }}
        >
          {loading ? 'Sending OTP…' : 'Send reset OTP'}
        </Button>
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
      </Stack>
    </form>
  );
}

export type { ForgotPasswordValues } from './forgot-password.types';
