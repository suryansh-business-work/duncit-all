import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AddressFields } from '@/forms/components/AddressFields';
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

const ADDRESS_NAMES = {
  line1: 'address_line1',
  line2: 'address_line2',
  landmark: 'address_landmark',
  city: 'address_city',
  state: 'address_state',
  pincode: 'address_pincode',
  country: 'address_country',
} as const;

export interface AccountEditFormProps {
  me: AccountMe | null;
  countries: CountryNode[];
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AccountEditValues) => void | Promise<void>;
  /** Notifies the parent sheet when there are unsaved changes (for the close guard). */
  onDirtyChange?: (dirty: boolean) => void;
  /** Lets the parent revert the form to its loaded values (discard-on-close). */
  onRegisterReset?: (reset: () => void) => void;
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
  onDirtyChange,
  onRegisterReset,
}: Readonly<AccountEditFormProps>) {
  const {
    control,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty, isValid },
  } = useForm<AccountEditValues>({
    values: accountEditDefaults(me),
    resolver: zodResolver(accountEditSchema),
    mode: 'onChange',
  });

  const discard = () => reset(accountEditDefaults(me));
  const discardDisabled = loading || !isDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onRegisterReset?.(discard);
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

      <Text fontSize={12} fontWeight="900" color="$muted" letterSpacing={0.6}>
        MAIN ADDRESS
      </Text>
      <AddressFields control={control} names={ADDRESS_NAMES} />

      <XStack
        testID="account-edit-discard"
        role="button"
        aria-label="Discard changes"
        aria-disabled={discardDisabled}
        onPress={() => {
          if (!discardDisabled) discard();
        }}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={discardDisabled ? 0.5 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="800" color="$color">
          Discard changes
        </Text>
      </XStack>

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
