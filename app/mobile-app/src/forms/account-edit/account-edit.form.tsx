import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { AccountMe } from '@/hooks/useAccount';
import type { CountryNode } from '@/utils/location-tree';
import { ContactFields } from './ContactFields';
import { DobDateField } from './DobDateField';
import { LocationSelect } from './LocationSelect';
import {
  accountEditDefaults,
  accountEditSchema,
  type AccountEditValues,
} from './account-edit.types';

export interface AccountEditFormProps {
  me: AccountMe | null;
  countries: CountryNode[];
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AccountEditValues) => void | Promise<void>;
}

/** Edit-profile form — name, bio, DOB picker, dependent location and phone/
 * whatsapp with country codes. RN twin of mWeb's AccountEditForm (RHF + Zod,
 * rule 10); Save stays disabled until a valid change is made. */
export function AccountEditForm({
  me,
  countries,
  loading,
  errorMessage,
  onSubmit,
}: Readonly<AccountEditFormProps>) {
  const {
    control,
    setValue,
    handleSubmit,
    formState: { isDirty, isValid },
  } = useForm<AccountEditValues>({
    values: accountEditDefaults(me),
    resolver: zodResolver(accountEditSchema),
    mode: 'onChange',
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

      <DobDateField control={control} />

      <LocationSelect control={control} setValue={setValue} countries={countries} />

      <ContactFields control={control} setValue={setValue} />

      <PrimaryButton
        testID="account-edit-submit"
        label={loading ? 'Saving…' : 'Save'}
        loading={loading}
        disabled={loading || !isDirty || !isValid}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
