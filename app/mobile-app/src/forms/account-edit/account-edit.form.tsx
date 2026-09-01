import { formResolver } from '../../utils/form-resolver';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import {
  contactDetailsComplete,
  usernameBlocksSave,
  type ContactSnapshot,
  type UsernameStatus,
} from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AddressFields } from '@/forms/components/AddressFields';
import { ContactSection } from '@/components/contact-change';
import type { AccountMe } from '@/hooks/useAccount';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useDateFormat } from '@/hooks/useDateFormat';
import { DobDateField } from './DobDateField';
import { LocationSelect } from './LocationSelect';
import { UsernameField } from './UsernameField';
import {
  accountEditDefaults,
  makeAccountEditSchema,
  toDobInput,
  type AccountEditValues,
} from './account-edit.types';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AccountEditValues) => void | Promise<void>;
  /** Notifies the parent sheet when there are unsaved changes (for the close guard). */
  onDirtyChange?: (dirty: boolean) => void;
  /** Lets the parent revert the form to its loaded values (discard-on-close). */
  onRegisterReset?: (reset: () => void) => void;
  /**
   * Told when a contact detail is proved and stored.
   *
   * Contacts do NOT ride this form's Save: each is its own verified write, so
   * it has already landed by the time this fires. The parent reloads on it.
   */
  onContactChanged?: () => void;
}

/** Edit-profile form — name, bio, DOB picker, dependent location and phone/
 * whatsapp with country codes. RN twin of mWeb's AccountEditForm (RHF + Zod,
 * rule 10); Save stays disabled until a valid change is made. */
export function AccountEditForm({
  me,
  loading,
  errorMessage,
  onSubmit,
  onDirtyChange,
  onRegisterReset,
  onContactChanged,
}: Readonly<AccountEditFormProps>) {
  const { t } = useTranslation();
  // Mirrored into state so a proved change shows on the row immediately,
  // rather than only once the parent's reload comes back.
  const [contacts, setContacts] = useState<ContactSnapshot>(() => ({
    email: me?.email,
    phone_extension: me?.phone_extension,
    phone_number: me?.phone_number,
    whatsapp_extension: me?.whatsapp_extension,
    whatsapp_number: me?.whatsapp_number,
  }));
  // The handle is checked against the server, which no Zod rule can wait for,
  // so its verdict is held here and ANDed into the one Save button below.
  const [handleStatus, setHandleStatus] = useState<UsernameStatus>('IDLE');
  // The joining age is admin-configured, so the schema is built from it.
  const { minSignupAge } = useAppSettings();
  const storedDob = toDobInput(me?.dob);
  const { datePlaceholder } = useDateFormat();
  const schema = useMemo(
    () => makeAccountEditSchema(minSignupAge, storedDob, datePlaceholder, t),
    [minSignupAge, storedDob, datePlaceholder, t],
  );
  const {
    control,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty, isValid },
  } = useForm<AccountEditValues, any, AccountEditValues>({
    values: accountEditDefaults(me),
    resolver: formResolver<AccountEditValues>(schema),
    mode: 'onChange',
  });

  const discard = () => reset(accountEditDefaults(me));
  const discardDisabled = loading || !isDirty;
  const handleBlocked = usernameBlocksSave(handleStatus, !!me?.username);
  // The three contact details are required, and none of them rides this Save —
  // each is its own proved write — so a missing one has to hold the button
  // rather than a Zod rule over a field the form does not have.
  const contactsIncomplete = !contactDetailsComplete(contacts);

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

      <UsernameField
        control={control}
        current={me?.username ?? null}
        onStatusChange={setHandleStatus}
      />

      <XStack gap={12}>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="first_name"
            label={t('mweb.common.firstName')}
            required
            autoCapitalize="words"
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="last_name"
            label={t('mweb.common.lastName')}
            autoCapitalize="words"
          />
        </YStack>
      </XStack>

      <FormTextField
        control={control}
        name="bio"
        label={t('mweb.common.bio')}
        hint="Up to 280 characters"
        multiline
        numberOfLines={3}
      />

      <ContactSection
        snapshot={contacts}
        onChanged={(_channel, next) => {
          setContacts(next);
          onContactChanged?.();
        }}
      />

      <DobDateField control={control} minAge={minSignupAge} />

      <LocationSelect control={control} setValue={setValue} />

      <Text fontSize={12} fontWeight="700" color="$muted" letterSpacing={0.6}>
        MAIN ADDRESS
      </Text>
      <AddressFields control={control} names={ADDRESS_NAMES} pincodeHint="6-digit PIN code" />

      <XStack
        testID="account-edit-discard"
        role="button"
        aria-label={t('mweb.accountEdit.discardChanges')}
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
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          Discard changes
        </Text>
      </XStack>

      <PrimaryButton
        testID="account-edit-submit"
        label={loading ? 'Saving…' : 'Save'}
        loading={loading}
        disabled={loading || !isDirty || !isValid || handleBlocked || contactsIncomplete}
        onPress={handleSubmit(onSubmit)}
      />
    </YStack>
  );
}
