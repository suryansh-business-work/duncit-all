import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { REQUEST_LOGIN_OTP, type LoginChannel } from '../../../graphql/account';
import { useStoreT } from '../../../i18n';
import { contactInput, makeOtpRequestSchema, type OtpRequestValues } from './otp-sign-in.types';

export interface OtpSent {
  channel: LoginChannel;
  contact: string;
  testCode: string | null;
}

/** Choose email or phone, then ask for a sign-in code there. */
export function OtpRequestStep({ onSent }: Readonly<{ onSent: (sent: OtpSent) => void }>) {
  const { t } = useStoreT();
  const [channel, setChannel] = useState<LoginChannel>('EMAIL');
  const [error, setError] = useState('');
  const schema = useMemo(() => makeOtpRequestSchema(t, channel), [t, channel]);
  const [requestOtp] = useMutation(REQUEST_LOGIN_OTP);
  const { control, handleSubmit, reset, formState } = useForm<OtpRequestValues>({
    resolver: zodResolver(schema),
    defaultValues: { contact: '' },
  });

  const submit = handleSubmit(async ({ contact }) => {
    setError('');
    try {
      const { data } = await requestOtp({ variables: { input: contactInput(channel, contact) } });
      const result = data?.requestLoginOtp;
      if (!result?.registered) {
        setError(t('ecommStore.auth.notRegistered'));
        return;
      }
      if (!result.sent) {
        setError(t('ecommStore.auth.codeNotSent'));
        return;
      }
      onSent({ channel, contact, testCode: result.test_code });
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.auth.failed')));
    }
  });

  const isEmail = channel === 'EMAIL';
  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={channel}
        aria-label={t('ecommStore.auth.codeChannel')}
        onChange={(_event, next: LoginChannel | null) => {
          if (!next) return;
          setChannel(next);
          reset({ contact: '' });
        }}
      >
        <ToggleButton value="EMAIL">{t('ecommStore.auth.viaEmail')}</ToggleButton>
        <ToggleButton value="PHONE">{t('ecommStore.auth.viaPhone')}</ToggleButton>
      </ToggleButtonGroup>
      <RhfTextField
        control={control}
        name="contact"
        type={isEmail ? 'email' : 'tel'}
        autoComplete={isEmail ? 'email' : 'tel-national'}
        label={isEmail ? t('ecommStore.auth.email') : t('ecommStore.auth.mobile')}
        hint={isEmail ? undefined : t('ecommStore.auth.mobileHint')}
      />
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
      <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
        {t('ecommStore.auth.sendCode')}
      </DuncitButton>
    </Stack>
  );
}
