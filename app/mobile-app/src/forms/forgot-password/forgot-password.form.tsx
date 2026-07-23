import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  forgotPasswordDefaults,
  forgotPasswordSchema,
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
  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    defaultValues: forgotPasswordDefaults,
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  return (
    <YStack gap={16}>
      <FormTextField
        control={control}
        name="email"
        label="Email"
        placeholder="hello@duncit.com"
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
        label={loading ? 'Sending OTP…' : 'Send reset OTP'}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
