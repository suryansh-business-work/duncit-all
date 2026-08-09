import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';
import {
  makeResetPasswordSchema,
  resetPasswordDefaults,
  type ResetPasswordFormValues,
} from './reset-password.types';

export interface ResetPasswordFormProps {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: ResetPasswordFormValues) => void | Promise<void>;
}

/** OTP + new password (confirmed) — RN twin of mWeb's reset-password form. */
export function ResetPasswordForm({
  loading,
  errorMessage,
  onSubmit,
}: Readonly<ResetPasswordFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeResetPasswordSchema(t), [t]);
  const { control, handleSubmit } = useForm<ResetPasswordFormValues>({
    defaultValues: resetPasswordDefaults,
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });
  const submitLabel = loading ? t('mweb.resetPassword.submitting') : t('mweb.resetPassword.submit');

  return (
    <YStack gap={16}>
      <FormTextField
        control={control}
        name="otp"
        label={t('mweb.resetPassword.otpLabel')}
        placeholder={t('mweb.resetPassword.otpPlaceholder')}
        keyboardType="number-pad"
        maxLength={6}
        required
        hint={t('mweb.resetPassword.otpHint')}
      />
      <FormTextField
        control={control}
        name="new_password"
        label={t('mweb.resetPassword.newPasswordLabel')}
        placeholder={t('mweb.resetPassword.newPasswordPlaceholder')}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        required
        hint={t('mweb.auth.passwordHint')}
      />
      <FormTextField
        control={control}
        name="confirm_password"
        label={t('mweb.resetPassword.confirmPasswordLabel')}
        placeholder={t('mweb.resetPassword.confirmPasswordPlaceholder')}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        required
      />

      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="reset-password-error">
          {errorMessage}
        </Text>
      ) : null}

      <PrimaryButton
        testID="reset-password-submit"
        label={submitLabel}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
