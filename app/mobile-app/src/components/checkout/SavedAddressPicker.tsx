import { useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { MyAddressesDocument } from '@/graphql/address-book';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';

type UserAddress = ResultOf<typeof MyAddressesDocument>['myAddresses'][number];

interface Props {
  onPick: (address: UserAddress) => void;
}

const summary = (address: UserAddress) =>
  `${address.label}${address.is_default ? ' (default)' : ''} — ${[address.line1, address.city]
    .filter(Boolean)
    .join(', ')}`;

/** Checkout address-book dropdown — the saved delivery address the order ships
 * to and that delivery charges are quoted for. The default address is
 * pre-selected once the book loads (picking another re-quotes delivery). Hidden
 * while the book is empty. RN twin of mWeb's SavedAddressPicker. */
export function SavedAddressPicker({ onPick }: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    graphqlRequest(MyAddressesDocument, undefined, { auth: true })
      .then((data) => {
        if (active) setAddresses(data.myAddresses);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const choose = useCallback(
    (address: UserAddress) => {
      setSelectedId(address.id);
      onPick(address);
    },
    [onPick],
  );

  // Auto-select the default (or first) saved address once the book loads.
  useEffect(() => {
    if (selectedId) return;
    const preferred = addresses.find((address) => address.is_default) ?? addresses[0];
    if (preferred) choose(preferred);
  }, [addresses, selectedId, choose]);

  if (addresses.length === 0) return null;
  const selected = addresses.find((address) => address.id === selectedId) ?? null;
  const close = () => setOpen(false);

  return (
    <YStack gap={6} testID="checkout-address-picker">
      <Text fontSize={12} fontWeight="800" color="$muted">
        Deliver to
      </Text>
      <XStack
        testID="checkout-address-field"
        role="button"
        aria-label="Choose a saved address"
        onPress={() => setOpen(true)}
        alignItems="center"
        gap={10}
        padding={12}
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name="home-work" size={18} color={primary} />
        <Text
          testID="checkout-address-field-label"
          flex={1}
          fontSize={13}
          fontWeight="700"
          color="$color"
          numberOfLines={1}
        >
          {selected ? summary(selected) : 'Select address'}
        </Text>
        <MaterialIcons name="expand-more" size={20} color={muted} />
      </XStack>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <ModalThemeScope>
          <YStack flex={1} justifyContent="flex-end">
            <YStack
              testID="checkout-address-backdrop"
              role="button"
              aria-label="Close"
              onPress={close}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              backgroundColor="$background"
              borderTopLeftRadius={22}
              borderTopRightRadius={22}
              maxHeight="70%"
            >
              <SafeAreaView edges={['bottom']}>
                <Text padding={16} fontSize={16} fontWeight="900" color="$color">
                  Deliver to a saved address
                </Text>
                <ScrollView>
                  <YStack paddingHorizontal={16} paddingBottom={16} gap={8}>
                    {addresses.map((address) => (
                      <XStack
                        key={address.id}
                        testID={`checkout-address-option-${address.id}`}
                        role="button"
                        aria-label={address.label}
                        onPress={() => {
                          choose(address);
                          close();
                        }}
                        alignItems="center"
                        gap={10}
                        padding={12}
                        borderRadius={12}
                        borderWidth={1}
                        borderColor={address.id === selectedId ? primary : '$borderColor'}
                        pressStyle={{ opacity: 0.85 }}
                      >
                        <MaterialIcons
                          name={
                            address.id === selectedId
                              ? 'radio-button-checked'
                              : 'radio-button-unchecked'
                          }
                          size={18}
                          color={address.id === selectedId ? primary : muted}
                        />
                        <Text
                          flex={1}
                          fontSize={13}
                          fontWeight="700"
                          color="$color"
                          numberOfLines={2}
                        >
                          {summary(address)}
                        </Text>
                      </XStack>
                    ))}
                  </YStack>
                </ScrollView>
              </SafeAreaView>
            </YStack>
          </YStack>
        </ModalThemeScope>
      </Modal>
    </YStack>
  );
}
