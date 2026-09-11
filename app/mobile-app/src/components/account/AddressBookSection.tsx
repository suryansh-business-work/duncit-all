import { useCallback, useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  AddressFormSheet,
  blankAddressValues,
  type AddressFormValues,
} from '@/components/account/AddressFormSheet';
import {
  DeleteMyAddressDocument,
  MyAddressesDocument,
  SaveMyAddressDocument,
} from '@/graphql/address-book';
import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toErrorMessage } from '@/utils/errors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

type UserAddress = ResultOf<typeof MyAddressesDocument>['myAddresses'][number];

const oneLine = (a: UserAddress) =>
  [a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ');

/** A 36px round soft icon button (edit / delete on an address row). */
function RowAction({
  testID,
  label,
  icon,
  onPress,
}: Readonly<{
  testID: string;
  label: string;
  icon: 'edit' | 'delete-outline';
  onPress: () => void;
}>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      width={36}
      height={36}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      backgroundColor="$soft"
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={18} color={muted} />
    </XStack>
  );
}

/** Profile Settings › Address Book — saved delivery addresses, selectable at
 * checkout. RN twin of mWeb's AddressBookSection. */
export function AddressBookSection() {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await graphqlRequest(MyAddressesDocument, undefined, { auth: true });
      setAddresses(data.myAddresses);
    } catch (e) {
      setError(toErrorMessage(e, 'Could not load your addresses.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (values: AddressFormValues) => {
    setSaving(true);
    setError('');
    try {
      await graphqlRequest(
        SaveMyAddressDocument,
        { id: editing?.id ?? null, input: values },
        { auth: true },
      );
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not save the address.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (address: UserAddress) => {
    setError('');
    try {
      await graphqlRequest(DeleteMyAddressDocument, { id: address.id }, { auth: true });
      await load();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not delete the address.'));
    }
  };

  return (
    <SurfaceCard testID="address-book-section" marginHorizontal={16} gap={4}>
      <XStack alignItems="center" justifyContent="space-between" gap={8} marginBottom={4}>
        <Text fontSize={17} fontWeight="600" color="$color">
          Address Book
        </Text>
        <DuncitButton
          testID="address-add"
          label={t('mweb.account.addAddress')}
          size="sm"
          icon={<MaterialIcons name="add" size={16} color={onPrimary} />}
          onPress={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        />
      </XStack>
      {error ? (
        <Text testID="address-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      {addresses.length === 0 ? (
        <Text fontSize={14} color="$muted" paddingVertical={8}>
          Save delivery addresses here to pick them quickly at checkout.
        </Text>
      ) : null}
      {addresses.map((address, addressIndex) => (
        <XStack
          key={address.id}
          gap={8}
          alignItems="center"
          paddingVertical={12}
          borderTopWidth={addressIndex === 0 ? 0 : 1}
          borderColor="$borderColor"
        >
          <YStack flex={1} minWidth={0} gap={2}>
            <XStack gap={6} alignItems="center">
              <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1} flexShrink={1}>
                {address.label}
              </Text>
              {address.is_default ? (
                <XStack
                  height={22}
                  paddingHorizontal={8}
                  alignItems="center"
                  borderRadius={999}
                  backgroundColor="$primarySoft"
                >
                  <Text fontSize={11} fontWeight="600" color="$primary">
                    {t('mweb.account.default')}
                  </Text>
                </XStack>
              ) : null}
            </XStack>
            <Text fontSize={13} color="$muted" numberOfLines={1}>
              {oneLine(address)}
            </Text>
          </YStack>
          <RowAction
            testID={`address-edit-${address.id}`}
            label={`Edit ${address.label}`}
            icon="edit"
            onPress={() => {
              setEditing(address);
              setFormOpen(true);
            }}
          />
          <RowAction
            testID={`address-delete-${address.id}`}
            label={`Delete ${address.label}`}
            icon="delete-outline"
            onPress={() => remove(address)}
          />
        </XStack>
      ))}
      <AddressFormSheet
        open={formOpen}
        title={editing ? 'Edit address' : 'Add address'}
        initial={editing ? { ...blankAddressValues, ...editing } : null}
        saving={saving}
        onCancel={() => setFormOpen(false)}
        onSubmit={submit}
      />
    </SurfaceCard>
  );
}
