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
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toErrorMessage } from '@/utils/errors';

type UserAddress = ResultOf<typeof MyAddressesDocument>['myAddresses'][number];

const oneLine = (a: UserAddress) =>
  [a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ');

/** Profile Settings › Address Book — saved delivery addresses, selectable at
 * checkout. RN twin of mWeb's AddressBookSection. */
export function AddressBookSection() {
  const { muted, primary } = useThemeColors();
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
    <YStack
      testID="address-book-section"
      margin={16}
      marginTop={0}
      padding={16}
      gap={10}
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack gap={8} alignItems="center">
          <MaterialIcons name="home-work" size={20} color={primary} />
          <Text fontSize={15} fontWeight="900" color="$color">
            Address Book
          </Text>
        </XStack>
        <XStack
          testID="address-add"
          role="button"
          aria-label="Add address"
          onPress={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          paddingHorizontal={12}
          height={34}
          alignItems="center"
          justifyContent="center"
          gap={4}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={{ opacity: 0.8 }}
        >
          <MaterialIcons name="add" size={16} color={muted} />
          <Text fontSize={12.5} fontWeight="800" color="$color">
            Add
          </Text>
        </XStack>
      </XStack>
      {error ? (
        <Text testID="address-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      {addresses.length === 0 ? (
        <Text fontSize={12.5} color="$muted">
          Save delivery addresses here to pick them quickly at checkout.
        </Text>
      ) : null}
      {addresses.map((address) => (
        <XStack
          key={address.id}
          gap={8}
          alignItems="center"
          padding={10}
          borderRadius={12}
          borderWidth={1}
          borderColor="$borderColor"
        >
          <YStack flex={1} minWidth={0}>
            <XStack gap={6} alignItems="center">
              <Text fontSize={13} fontWeight="800" color="$color">
                {address.label}
              </Text>
              {address.is_default ? (
                <Text fontSize={10.5} fontWeight="900" color="$primary">
                  DEFAULT
                </Text>
              ) : null}
            </XStack>
            <Text fontSize={11.5} color="$muted" numberOfLines={1}>
              {oneLine(address)}
            </Text>
          </YStack>
          <XStack
            testID={`address-edit-${address.id}`}
            role="button"
            aria-label={`Edit ${address.label}`}
            onPress={() => {
              setEditing(address);
              setFormOpen(true);
            }}
            padding={6}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="edit" size={18} color={muted} />
          </XStack>
          <XStack
            testID={`address-delete-${address.id}`}
            role="button"
            aria-label={`Delete ${address.label}`}
            onPress={() => remove(address)}
            padding={6}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="delete-outline" size={18} color={muted} />
          </XStack>
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
    </YStack>
  );
}
