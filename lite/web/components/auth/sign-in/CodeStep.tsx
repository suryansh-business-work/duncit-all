import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../../shared/i18n';
import { useLiteSession } from '../../../../shared/session';
import { makeCodeSchema, type CodeSent, type CodeValues } from './sign-in.types';
import { useSignInCalls } from './useSignInCalls';

interface CodeStepProps {
  sent: CodeSent;
  onBack: () => void;
}

/** Seconds until "send a new code" opens again, counting down from the server's figure. */
function useCountdown(seconds: number): number {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    if (seconds <= 0) return undefined;
    const timer = globalThis.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => globalThis.clearInterval(timer);
  }, [seconds]);
  return left;
}

/** Type the code that arrived; a first-time Lite account also gives its name. */
export function CodeStep({ sent, onBack }: Readonly<CodeStepProps>) {
  const { t } = useWebT();
  const { completeSignIn } = useLiteSession();
  const [error, setError] = useState('');
  const [resent, setResent] = useState<CodeSent>(sent);
  const left = useCountdown(resent.resendAfter);
  const schema = useMemo(() => makeCodeSchema(t), [t]);
  const { request, verify, requesting } = useSignInCalls();
  const { control, handleSubmit, formState } = useForm<CodeValues>({ resolver: zodResolver(schema), defaultValues: { code: '', name: '' } });

  const submit = handleSubmit(async ({ code, name }) => {
    setError('');
    try {
      const token = await verify(resent.channel, resent.contact, code, name || undefined);
      if (token) await completeSignIn(token);
    } catch (err) {
      setError(parseApiError(err, t('liteWeb.signIn.failed')));
    }
  });

  const resend = async () => {
    setError('');
    try {
      const result = await request(resent.channel, resent.contact);
      if (result) setResent({ ...resent, resendAfter: result.resend_after_seconds, testCode: result.test_code, minutes: result.expires_in_minutes });
    } catch (err) {
      setError(parseApiError(err, t('liteWeb.signIn.failed')));
    }
  };

  const SENT_KEYS = { DUNCIT: 'lite.auth.codeSentDuncit', LITE: 'lite.auth.codeSentLite', SMS: 'lite.auth.codeSentSms' } as const;
  const sentKey = SENT_KEYS[resent.via];
  const resendLabel = left > 0 ? t('lite.auth.resendIn', { vars: { seconds: left } }) : t('lite.auth.resend');
  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate data-testid="sign-in-code-form">
      <Typography variant="body2">{t(sentKey, { vars: { email: resent.contact, phone: resent.contact, minutes: resent.minutes } })}</Typography>
      {resent.testCode ? (
        <Alert severity="info" data-testid="sign-in-test-code">
          {t('lite.auth.testCode', { vars: { code: resent.testCode } })}
        </Alert>
      ) : null}
      <RhfTextField
        control={control}
        name="code"
        autoComplete="one-time-code"
        label={t('lite.auth.code')}
        hint={t('lite.auth.codeHint')}
        slotProps={{ htmlInput: { maxLength: 6, inputMode: 'numeric', 'data-testid': 'sign-in-code' } }}
      />
      {resent.via === 'DUNCIT' ? null : (
        <RhfTextField
          control={control}
          name="name"
          autoComplete="name"
          label={t('lite.auth.name')}
          hint={t('lite.auth.nameHint')}
          slotProps={{ htmlInput: { 'data-testid': 'sign-in-name' } }}
        />
      )}
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
      <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} data-testid="sign-in-verify">
        {t('lite.auth.verify')}
      </DuncitButton>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <DuncitButton onClick={resend} disabled={left > 0} loading={requesting} data-testid="sign-in-resend">
          {resendLabel}
        </DuncitButton>
        <DuncitButton onClick={onBack} data-testid="sign-in-change-email">
          {t(resent.channel === 'PHONE' ? 'lite.auth.changePhone' : 'lite.auth.changeEmail')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
