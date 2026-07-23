import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  resetPasswordDefaults,
  resetPasswordSchema,
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
  const { control, handleSubmit } = useForm<ResetPasswordFormValues>({
    defaultValues: resetPasswordDefaults,
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  return (
    <YStack gap={16}>
      <FormTextField
        control={control}
        name="otp"
        label="6-digit OTP"
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        required
        hint="6-digit code"
      />
      <FormTextField
        control={control}
        name="new_password"
        label="New password"
        placeholder="Create a new password"
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        required
        hint="At least 8 characters"
      />
      <FormTextField
        control={control}
        name="confirm_password"
        label="Confirm new password"
        placeholder="Re-enter new password"
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
        label={loading ? 'Resetting…' : 'Reset password'}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
