import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Link, Stack, Typography } from '@mui/material';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../../shared/i18n';
import { useLiteSettings } from '../../../app/providers/LiteSettingsProvider';
import { makeContactSchema, type CodeSent, type ContactValues, type SignInChannel } from './sign-in.types';
import { useSignInCalls } from './useSignInCalls';

/** The address box for one channel; remounted on a switch so each keeps its own value and errors. */
function ContactForm({ channel, onSent }: Readonly<{ channel: SignInChannel; onSent: (sent: CodeSent) => void }>) {
  const { t } = useWebT();
  const { default_country_code: countryCode } = useLiteSettings();
  const [error, setError] = useState('');
  const schema = useMemo(() => makeContactSchema(t, channel), [t, channel]);
  const { request } = useSignInCalls();
  const { control, handleSubmit, formState } = useForm<ContactValues>({ resolver: zodResolver(schema), defaultValues: { value: '' } });
  const email = channel === 'EMAIL';

  const submit = handleSubmit(async ({ value }) => {
    setError('');
    try {
      const result = await request(channel, value);
      if (!result?.ok) {
        setError(t('liteWeb.signIn.notSent'));
        return;
      }
      onSent({ channel, contact: value, via: result.via, minutes: result.expires_in_minutes, resendAfter: result.resend_after_seconds, testCode: result.test_code });
    } catch (err) {
      setError(parseApiError(err, t('liteWeb.signIn.failed')));
    }
  });

  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate data-testid={email ? 'sign-in-email-form' : 'sign-in-phone-form'}>
      <RhfTextField
        control={control}
        name="value"
        type={email ? 'email' : 'tel'}
        autoComplete={email ? 'email' : 'tel'}
        label={t(email ? 'lite.auth.email' : 'lite.auth.phone')}
        hint={email ? t('lite.auth.emailHint') : t('lite.auth.phoneHint', { vars: { code: countryCode } })}
        slotProps={{ htmlInput: { inputMode: email ? 'email' : 'tel', maxLength: email ? 254 : 20, 'data-testid': email ? 'sign-in-email' : 'sign-in-phone' } }}
      />
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
      <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} data-testid="sign-in-send-code">
        {t(email ? 'lite.auth.continueEmail' : 'lite.auth.continuePhone')}
      </DuncitButton>
    </Stack>
  );
}

/** Ask for a sign-in code by email — or by SMS, when the console has phone sign-in on. */
export function ContactStep({ onSent }: Readonly<{ onSent: (sent: CodeSent) => void }>) {
  const { t } = useWebT();
  const { phone_sign_in: phoneReady } = useLiteSettings();
  const [channel, setChannel] = useState<SignInChannel>('EMAIL');
  const other: SignInChannel = channel === 'EMAIL' ? 'PHONE' : 'EMAIL';
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {t('lite.auth.subtitle')}
        </Typography>
        {phoneReady ? (
          <Link component="button" type="button" variant="body2" onClick={() => setChannel(other)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0, fontWeight: 700 }} data-testid="sign-in-switch">
            {other === 'PHONE' ? <SmartphoneOutlinedIcon sx={{ fontSize: 16 }} aria-hidden /> : <MailOutlinedIcon sx={{ fontSize: 16 }} aria-hidden />}
            {t(other === 'PHONE' ? 'lite.auth.usePhone' : 'lite.auth.useEmail')}
          </Link>
        ) : null}
      </Stack>
      <ContactForm key={channel} channel={channel} onSent={onSent} />
    </Stack>
  );
}
