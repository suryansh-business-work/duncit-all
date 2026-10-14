import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, TextField } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { emailVerifySchema, emailVerifyDefaults } from './email-verify.schema';
import type { EmailVerifyFormProps, EmailVerifyFormValues } from './email-verify.types';

/** Email Verifier → single check: one address, checked against its mail server now. */
export default function EmailVerifyForm({ submitting, onSubmit }: Readonly<EmailVerifyFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => emailVerifySchema(t), [t]);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailVerifyFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: emailVerifyDefaults,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="email-verify-form">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              type="email"
              label={t('shell.common.email')}
              required
              fullWidth
              autoComplete="off"
              error={!!errors.email}
              helperText={errors.email?.message ?? t('crm.emailVerifier.singleHint')}
              slotProps={{ htmlInput: { 'data-testid': 'email-verify-input' } }}
            />
          )}
        />
        <DuncitButton
          type="submit"
          variant="contained"
          startIcon={<MarkEmailReadIcon />}
          loading={submitting}
          sx={{ flexShrink: 0 }}
          data-testid="email-verify-submit"
        >
          {submitting ? t('crm.emailVerifier.checking') : t('crm.emailVerifier.verify')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
