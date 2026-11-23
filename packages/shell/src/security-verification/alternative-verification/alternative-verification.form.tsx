import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '../../i18n/useTranslation';
import {
  makeSecurityExceptionSchema,
  securityExceptionDefaults,
  type AlternativeVerificationFormProps,
  type SecurityExceptionValues,
} from './alternative-verification.types';

/** "Why can't you share your location?" — the one box the administrator reads. */
export function AlternativeVerificationForm({ onSubmit, busy }: Readonly<AlternativeVerificationFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeSecurityExceptionSchema(t), [t]);
  const { control, handleSubmit } = useForm<SecurityExceptionValues>({
    defaultValues: securityExceptionDefaults,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  // The caller shows the server's refusal; the form just keeps what was typed.
  const submit = async ({ reason }: SecurityExceptionValues) => {
    await onSubmit(reason).catch(() => undefined);
  };

  return (
    <form noValidate onSubmit={handleSubmit(submit)} data-testid="security-alternative-form">
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="reason"
          label={t('shell.securityVerification.alternative.reasonLabel')}
          hint={t('shell.securityVerification.alternative.reasonHint')}
          required
          multiline
          minRows={3}
          size="small"
          data-testid="security-alternative-reason"
        />
        <DuncitButton type="submit" variant="outlined" disabled={busy} data-testid="security-alternative-submit">
          {busy ? t('shell.securityVerification.alternative.sending') : t('shell.securityVerification.alternative.submit')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
