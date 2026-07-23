import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  currentPasswordDefaults,
  currentPasswordSchema,
  newPasswordDefaults,
  newPasswordSchema,
  type CurrentPasswordValues,
  type NewPasswordValues,
} from './change-password.types';

interface StepProps<T> {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: T) => void | Promise<void>;
}

/** Step 1 — verify the current password to request an OTP. */
export function CurrentPasswordForm({
  loading,
  errorMessage,
  onSubmit,
}: Readonly<StepProps<CurrentPasswordValues>>) {
  const { control, handleSubmit } = useForm<CurrentPasswordValues>({
    defaultValues: currentPasswordDefaults,
    resolver: zodResolver(currentPasswordSchema),
    mode: 'onBlur',
  });

  return (
    <YStack gap={16}>
      <FormTextField
        control={control}
        name="current_password"
        label="Current password"
        placeholder="Enter your current password"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        required
      />
      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="current-password-error">
          {errorMessage}
        </Text>
      ) : null}
      <PrimaryButton
        testID="current-password-submit"
        label={loading ? 'Sending OTP…' : 'Send OTP'}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}

/** Step 2 — OTP + new password (confirmed) to commit the change. */
export function NewPasswordForm({
  loading,
  errorMessage,
  onSubmit,
}: Readonly<StepProps<NewPasswordValues>>) {
  const { control, handleSubmit } = useForm<NewPasswordValues>({
    defaultValues: newPasswordDefaults,
    resolver: zodResolver(newPasswordSchema),
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
        <Text fontSize={14} color="$danger" testID="new-password-error">
          {errorMessage}
        </Text>
      ) : null}
      <PrimaryButton
        testID="new-password-submit"
        label={loading ? 'Updating…' : 'Update password'}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
