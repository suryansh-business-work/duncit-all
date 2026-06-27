import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { OTP_PATTERN } from '../../../forms/validation/rules';
import type { EmailVerificationFormProps, EmailVerificationValues } from './email-verification.types';

const REQUEST_EMAIL_OTP = gql`
  mutation RequestEmailVerificationOtp {
    requestEmailVerificationOtp {
      ok
      dev_otp
    }
  }
`;

const VERIFY_EMAIL_OTP = gql`
  mutation VerifyEmailVerificationOtp($otp: String!) {
    verifyEmailVerificationOtp(otp: $otp) {
      user_id
      is_email_verified
    }
  }
`;

export const emailVerificationSchema = z.object({
  otp: z
    .string()
    .trim()
    .min(1, 'OTP is required')
    .regex(OTP_PATTERN, 'Enter the OTP we sent'),
});

export default function EmailVerificationForm({ email, verified, onVerified }: Readonly<EmailVerificationFormProps>) {
  const [requestOtp, requestState] = useMutation(REQUEST_EMAIL_OTP);
  const [verifyOtp, verifyState] = useMutation(VERIFY_EMAIL_OTP);
  const [requested, setRequested] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<EmailVerificationValues>({
    defaultValues: { otp: '' },
    resolver: zodResolver(emailVerificationSchema),
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await verifyOtp({ variables: { otp: values.otp } });
      setMessage('Email verified.');
      onVerified();
    } catch (e: any) {
      setError(e?.message ?? 'Invalid OTP');
    }
  });

  const sendOtp = async () => {
    setError(null);
    setMessage(null);
    const res = await requestOtp();
    setRequested(true);
    setDevOtp(res.data?.requestEmailVerificationOtp?.dev_otp ?? null);
    setMessage(`OTP sent to ${email}`);
  };

  if (verified) {
    return <Alert severity="success">Your email is verified.</Alert>;
  }

  return (
    <Stack id="email-verification" spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <MarkEmailReadIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" fontWeight={700}>Verify email</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">{email || 'Add an email address to verify your account.'}</Typography>
      {message && <Alert severity="success">{message}</Alert>}
      {devOtp && <Alert severity="info">Dev OTP: {devOtp}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <form noValidate onSubmit={submit}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'flex-start' }}>
          <Button variant="outlined" onClick={sendOtp} disabled={!email || requestState.loading}>
            {requested ? 'Resend OTP' : 'Send OTP'}
          </Button>
          <Controller
            control={control}
            name="otp"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="OTP"
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? ' '}
                size="small"
                inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              />
            )}
          />
          <Button type="submit" variant="contained" disabled={verifyState.loading}>Verify</Button>
        </Stack>
      </form>
    </Stack>
  );
}