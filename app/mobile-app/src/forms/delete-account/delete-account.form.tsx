import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  deleteAccountDefaults,
  deleteAccountSchema,
  type DeleteAccountValues,
} from './delete-account.types';

export interface DeleteAccountFormProps {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: DeleteAccountValues) => void | Promise<void>;
}

/** OTP step that confirms permanent account deletion — RN twin of mWeb's form. */
export function DeleteAccountForm({
  loading,
  errorMessage,
  onSubmit,
}: Readonly<DeleteAccountFormProps>) {
  const { control, handleSubmit } = useForm<DeleteAccountValues>({
    defaultValues: deleteAccountDefaults,
    resolver: zodResolver(deleteAccountSchema),
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
      />
      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="delete-account-error">
          {errorMessage}
        </Text>
      ) : null}
      <PrimaryButton
        testID="delete-account-submit"
        label={loading ? 'Deleting…' : 'Delete my account'}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
