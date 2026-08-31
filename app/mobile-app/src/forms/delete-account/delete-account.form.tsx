import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';
import {
  deleteAccountDefaults,
  makeDeleteAccountSchema,
  type DeleteAccountValues,
} from './delete-account.types';

export interface DeleteAccountFormProps {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: DeleteAccountValues) => void | Promise<void>;
}

/** Confirms the emailed code and sends the deletion request — RN twin of
 * mWeb's form, same rules and same copy. */
export function DeleteAccountForm({
  loading,
  errorMessage,
  onSubmit,
}: Readonly<DeleteAccountFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeDeleteAccountSchema(t), [t]);
  const { control, handleSubmit } = useForm<DeleteAccountValues, any, DeleteAccountValues>({
    defaultValues: deleteAccountDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<
      DeleteAccountValues,
      any,
      DeleteAccountValues
    >,
    mode: 'onBlur',
  });

  return (
    <YStack gap={16}>
      <FormTextField
        control={control}
        name="otp"
        label={t('mweb.account.deletion.otpLabel')}
        placeholder={t('mweb.account.deletion.otpPlaceholder')}
        keyboardType="number-pad"
        digitsOnly
        maxLength={6}
        required
        hint={t('mweb.account.deletion.otpHint')}
      />
      <FormTextField
        control={control}
        name="reason"
        label={t('mweb.account.deletion.reasonLabel')}
        placeholder={t('mweb.account.deletion.reasonPlaceholder')}
        hint={t('mweb.account.deletion.reasonHint')}
        multiline
        numberOfLines={3}
      />
      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="delete-account-error">
          {errorMessage}
        </Text>
      ) : null}
      <PrimaryButton
        testID="delete-account-submit"
        label={loading ? t('mweb.account.deletion.submitting') : t('mweb.account.deletion.submit')}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
