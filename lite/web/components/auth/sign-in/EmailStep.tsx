import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { LITE_REQUEST_SIGN_IN_CODE } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { makeEmailSchema, type CodeSent, type EmailValues, type SignInRequestResult } from './sign-in.types';

/** Ask for a sign-in code at an email address. */
export function EmailStep({ onSent }: Readonly<{ onSent: (sent: CodeSent) => void }>) {
  const { t } = useWebT();
  const [error, setError] = useState('');
  const schema = useMemo(() => makeEmailSchema(t), [t]);
  const [requestCode] = useMutation<{ liteRequestSignInCode: SignInRequestResult }, { email: string }>(LITE_REQUEST_SIGN_IN_CODE);
  const { control, handleSubmit, formState } = useForm<EmailValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const submit = handleSubmit(async ({ email }) => {
    setError('');
    try {
      const { data } = await requestCode({ variables: { email } });
      const result = data?.liteRequestSignInCode;
      if (!result?.ok) {
        setError(t('liteWeb.signIn.notSent'));
        return;
      }
      onSent({ email, via: result.via, minutes: result.expires_in_minutes, resendAfter: result.resend_after_seconds, testCode: result.test_code });
    } catch (err) {
      setError(parseApiError(err, t('liteWeb.signIn.failed')));
    }
  });

  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate data-testid="sign-in-email-form">
      <Typography variant="body2" color="text.secondary">
        {t('lite.auth.subtitle')}
      </Typography>
      <RhfTextField
        control={control}
        name="email"
        type="email"
        autoComplete="email"
        label={t('lite.auth.email')}
        hint={t('lite.auth.emailHint')}
        slotProps={{ htmlInput: { 'data-testid': 'sign-in-email' } }}
      />
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
      <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} data-testid="sign-in-send-code">
        {t('lite.auth.sendCode')}
      </DuncitButton>
    </Stack>
  );
}
