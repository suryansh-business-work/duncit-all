import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { AccountMe } from '@/hooks/useAccount';
import {
  accountEditDefaults,
  accountEditSchema,
  type AccountEditValues,
} from './account-edit.types';

export interface AccountEditFormProps {
  me: AccountMe | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AccountEditValues) => void | Promise<void>;
}

/** Edit-profile form — name, bio, location and phone/whatsapp. RN twin of mWeb's
 * EditAccountDialog body (React Hook Form + Zod, rule 10). */
export function AccountEditForm({ me, loading, errorMessage, onSubmit }: Readonly<AccountEditFormProps>) {
  const { control, handleSubmit } = useForm<AccountEditValues>({
    values: accountEditDefaults(me),
    resolver: zodResolver(accountEditSchema),
    mode: 'onBlur',
  });

  return (
    <YStack gap={14}>
      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="account-edit-error">
          {errorMessage}
        </Text>
      ) : null}

      <XStack gap={12}>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="first_name"
            label="First name"
            autoCapitalize="words"
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="last_name"
            label="Last name"
            autoCapitalize="words"
          />
        </YStack>
      </XStack>

      <FormTextField control={control} name="bio" label="Bio" multiline numberOfLines={3} />

      <XStack gap={12}>
        <YStack flex={1}>
          <FormTextField control={control} name="city" label="City" />
        </YStack>
        <YStack flex={1}>
          <FormTextField control={control} name="zone" label="Zone" />
        </YStack>
      </XStack>

      <FormTextField control={control} name="country" label="Country" />

      <XStack gap={12}>
        <YStack width={96}>
          <FormTextField
            control={control}
            name="phone_extension"
            label="Code"
            keyboardType="phone-pad"
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="phone_number"
            label="Phone number"
            keyboardType="phone-pad"
          />
        </YStack>
      </XStack>

      <XStack gap={12}>
        <YStack width={96}>
          <FormTextField
            control={control}
            name="whatsapp_extension"
            label="Code"
            keyboardType="phone-pad"
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="whatsapp_number"
            label="WhatsApp number"
            keyboardType="phone-pad"
          />
        </YStack>
      </XStack>

      <PrimaryButton
        testID="account-edit-submit"
        label={loading ? 'Saving…' : 'Save'}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
