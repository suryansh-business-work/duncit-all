import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, TextField } from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { DuncitButton } from '@duncit/buttons';
import { formatTime, useTranslation } from '@duncit/app-settings';
import { cleanCode, envAccessSchema, type EnvAccessValues, type PendingCode } from './env-access.types';

interface Props {
  pending: PendingCode | null;
  sending: boolean;
  verifying: boolean;
  onSend: () => void;
  onVerify: (code: string) => void;
}

/** Seconds left until `at`, ticking once a second while there are any. */
function useSecondsUntil(at: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  const left = at ? Math.max(0, Math.ceil((at - now) / 1000)) : 0;
  useEffect(() => {
    if (left <= 0) return undefined;
    const timer = globalThis.setTimeout(() => setNow(Date.now()), 1000);
    return () => globalThis.clearTimeout(timer);
  }, [left, now]);
  return left;
}

/** Send the root admin a code, then type it. */
export default function EnvAccessForm({ pending, sending, verifying, onSend, onVerify }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => envAccessSchema(t('tech.environment.accessCodeInvalid')), [t]);
  const { control, handleSubmit, reset } = useForm<EnvAccessValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });
  const resendIn = useSecondsUntil(pending?.resendAt ?? null);

  // A new code makes the one typed for the old one meaningless.
  useEffect(() => reset({ code: '' }), [pending?.challengeId, reset]);

  if (!pending) {
    return (
      <DuncitButton
        variant="contained"
        startIcon={<MarkEmailReadIcon />}
        loading={sending}
        onClick={onSend}
        data-testid="env-access-send"
      >
        {t('tech.environment.accessSend')}
      </DuncitButton>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit((values) => onVerify(values.code))} data-testid="env-access-form">
      <Stack spacing={2}>
        <Controller
          control={control}
          name="code"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              onChange={(event) => field.onChange(cleanCode(event.target.value))}
              label={t('tech.environment.accessCodeLabel')}
              required
              autoComplete="one-time-code"
              error={!!fieldState.error}
              helperText={
                fieldState.error?.message ??
                t('tech.environment.accessCodeHint', {
                  vars: { email: pending.sentTo, time: formatTime(pending.expiresAt) },
                })
              }
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6, 'data-testid': 'env-access-code' } }}
            />
          )}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton variant="text" disabled={resendIn > 0} loading={sending} onClick={onSend}>
            {resendIn > 0
              ? t('tech.environment.accessResendIn', { vars: { seconds: resendIn } })
              : t('tech.environment.accessResend')}
          </DuncitButton>
          <DuncitButton
            type="submit"
            variant="contained"
            startIcon={<LockOpenIcon />}
            loading={verifying}
            data-testid="env-access-verify"
          >
            {t('tech.environment.accessVerify')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
