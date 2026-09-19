import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { usePortalT } from '../../../../shared/i18n';
import { makeCodeSchema, type CodeStepValues, type SignInRequest } from './sign-in.types';
import { useCountdown } from './useCountdown';

interface Props {
  email: string;
  request: SignInRequest;
  busy: boolean;
  resending: boolean;
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
}

/** Step two: the 6-digit code, with resend after the server's cool-down. */
export function CodeStep({ email, request, busy, resending, onSubmit, onResend, onChangeEmail }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeCodeSchema(t), [t]);
  const secondsLeft = useCountdown(request.resend_after_seconds, request);
  const { control, handleSubmit } = useForm<CodeStepValues, unknown, CodeStepValues>({
    defaultValues: { code: '' },
    resolver: zodResolver(schema) as Resolver<CodeStepValues, unknown, CodeStepValues>,
    mode: 'onBlur',
  });

  const sentVars = { vars: { email, minutes: request.expires_in_minutes } };
  const sentCopy = request.via === 'DUNCIT' ? t('lite.auth.codeSentDuncit', sentVars) : t('lite.auth.codeSentLite', sentVars);
  const resendCopy = secondsLeft > 0 ? t('lite.auth.resendIn', { vars: { seconds: secondsLeft } }) : t('lite.auth.resend');

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values.code))} noValidate data-testid="sign-in-code-form">
      <Stack spacing={2}>
        <Typography variant="body2" data-testid="sign-in-code-sent">
          {sentCopy}
        </Typography>
        {request.test_code && (
          <Alert severity="info" data-testid="sign-in-test-code">
            {t('lite.auth.testCode', { vars: { code: request.test_code } })}
          </Alert>
        )}
        <RhfTextField
          control={control}
          name="code"
          label={t('lite.auth.code')}
          hint={t('lite.auth.codeHint')}
          required
          autoComplete="one-time-code"
          disabled={busy}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6, 'data-testid': 'sign-in-code' } }}
        />
        <DuncitButton type="submit" variant="contained" size="large" loading={busy} data-testid="sign-in-verify">
          {busy ? t('lite.auth.verifying') : t('lite.auth.verify')}
        </DuncitButton>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <DuncitButton size="small" onClick={onResend} disabled={secondsLeft > 0 || resending || busy} data-testid="sign-in-resend">
            {resendCopy}
          </DuncitButton>
          <DuncitButton size="small" onClick={onChangeEmail} disabled={busy} data-testid="sign-in-change-email">
            {t('lite.auth.changeEmail')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
