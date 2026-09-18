import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { LOGIN_WITH_OTP } from '../../../graphql/account';
import { useStoreT } from '../../../i18n';
import { OtpRequestStep, type OtpSent } from './OtpRequestStep';
import { contactInput, makeOtpVerifySchema, type OtpVerifyValues } from './otp-sign-in.types';

interface VerifyProps {
  sent: OtpSent;
  onBack: () => void;
  onToken: (token: string) => Promise<void>;
}

function OtpVerifyStep({ sent, onBack, onToken }: Readonly<VerifyProps>) {
  const { t } = useStoreT();
  const [error, setError] = useState('');
  const schema = useMemo(() => makeOtpVerifySchema(t), [t]);
  const [loginWithOtp] = useMutation(LOGIN_WITH_OTP);
  const { control, handleSubmit, formState } = useForm<OtpVerifyValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  const submit = handleSubmit(async ({ code }) => {
    setError('');
    try {
      const input = { ...contactInput(sent.channel, sent.contact), otp: code };
      const { data } = await loginWithOtp({ variables: { input } });
      if (data?.loginWithOtp.token) await onToken(data.loginWithOtp.token);
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.auth.failed')));
    }
  });

  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate>
      <Typography variant="body2">{t('ecommStore.auth.codeSentTo', { vars: { contact: sent.contact } })}</Typography>
      {sent.testCode ? (
        <Alert severity="info">{t('ecommStore.auth.testCode', { vars: { code: sent.testCode } })}</Alert>
      ) : null}
      <RhfTextField
        control={control}
        name="code"
        autoComplete="one-time-code"
        label={t('ecommStore.auth.code')}
        slotProps={{ htmlInput: { maxLength: 6, inputMode: 'numeric' } }}
      />
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
      <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
        {t('ecommStore.auth.verifyAndSignIn')}
      </DuncitButton>
      <DuncitButton onClick={onBack}>{t('ecommStore.auth.changeContact')}</DuncitButton>
    </Stack>
  );
}

/** Sign in with a one-time code sent to an email address or a mobile number. */
export function OtpSignInForm({ onToken }: Readonly<{ onToken: (token: string) => Promise<void> }>) {
  const [sent, setSent] = useState<OtpSent | null>(null);
  if (sent) return <OtpVerifyStep sent={sent} onBack={() => setSent(null)} onToken={onToken} />;
  return <OtpRequestStep onSent={setSent} />;
}
