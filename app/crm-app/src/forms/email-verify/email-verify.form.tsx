import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  emailVerifyDefaults,
  makeEmailVerifySchema,
  type EmailVerifyValues,
} from './email-verify.types';

/** The address to check, and Check — the portal's single-check form. */
export function EmailVerifyForm({
  onSubmit,
}: Readonly<{ onSubmit: (values: EmailVerifyValues) => Promise<void> }>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<EmailVerifyValues>(makeEmailVerifySchema(t)), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<EmailVerifyValues, any, EmailVerifyValues>({
    defaultValues: emailVerifyDefaults,
    resolver,
    mode: 'onTouched',
  });
  return (
    <YStack gap="$3">
      <TextField
        control={control}
        name="email"
        label={t('crmApp.emailVerifier.email')}
        variant="pill"
        icon="mail-outline"
        keyboardType="email-address"
        autoComplete="email"
        testID="email-verify-email"
      />
      <DuncitButton
        label={t('crmApp.emailVerifier.check')}
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
        fullWidth
        testID="email-verify-submit"
      />
    </YStack>
  );
}
