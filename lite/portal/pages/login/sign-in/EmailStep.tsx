import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { usePortalT } from '../../../../shared/i18n';
import { makeEmailSchema, type EmailStepValues } from './sign-in.types';

interface Props {
  busy: boolean;
  onSubmit: (email: string) => Promise<void>;
}

/** Step one: the address a code goes to. */
export function EmailStep({ busy, onSubmit }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeEmailSchema(t), [t]);
  const { control, handleSubmit } = useForm<EmailStepValues, unknown, EmailStepValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(schema) as Resolver<EmailStepValues, unknown, EmailStepValues>,
    mode: 'onBlur',
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values.email))} noValidate data-testid="sign-in-email-form">
      <Stack spacing={2}>
        <RhfTextField
          control={control}
          name="email"
          type="email"
          label={t('lite.auth.email')}
          hint={t('lite.auth.emailHint')}
          required
          autoComplete="email"
          disabled={busy}
          slotProps={{ htmlInput: { 'data-testid': 'sign-in-email' } }}
        />
        <DuncitButton type="submit" variant="contained" size="large" loading={busy} data-testid="sign-in-send-code">
          {busy ? t('lite.auth.sending') : t('lite.auth.sendCode')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
