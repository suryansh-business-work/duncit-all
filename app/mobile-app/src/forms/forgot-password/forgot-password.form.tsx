import { useMemo } from 'react';
import { useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';
import {
  forgotPasswordDefaults,
  makeForgotPasswordSchema,
  type ForgotPasswordValues,
} from './forgot-password.types';

export interface ForgotPasswordFormProps {
  loading?: boolean;
  errorMessage?: string | null;
  /** Server-side validation shown directly below the email field (e.g. "Unregistered User"). */
  emailError?: string | null;
  onSubmit: (values: ForgotPasswordValues) => void | Promise<void>;
}

/** Email entry that requests a password-reset OTP — RN twin of mWeb's form. */
export function ForgotPasswordForm({
  loading,
  errorMessage,
  emailError,
  onSubmit,
}: Readonly<ForgotPasswordFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeForgotPasswordSchema(t), [t]);
  const { control, handleSubmit } = useForm<ForgotPasswordValues, any, ForgotPasswordValues>({
    defaultValues: forgotPasswordDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<ForgotPasswordValues, any, ForgotPasswordValues>,
    mode: 'onBlur',
  });
  const submitLabel = loading
    ? t('mweb.forgotPassword.submitting')
    : t('mweb.forgotPassword.submit');

  return (
    <YStack gap={16}>
      <FormTextField
        control={control}
        name="email"
        label={t('mweb.auth.emailLabel')}
        placeholder={t('mweb.auth.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        required
      />

      {emailError ? (
        <Text fontSize={13} color="$danger" testID="forgot-email-error" marginTop={-8}>
          {emailError}
        </Text>
      ) : null}

      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="forgot-password-error">
          {errorMessage}
        </Text>
      ) : null}

      <PrimaryButton
        testID="forgot-password-submit"
        label={submitLabel}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
