import type { ReactNode } from 'react';
import { Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { deliveryAddressLine } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { ModalSafeArea } from '@/components/ModalSafeArea';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import type { UserAddress } from '@/hooks/useDeliveryAddress';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  addresses: UserAddress[];
  selectedId: string;
  onSelect: (address: UserAddress) => void;
  /** Shown instead of the list — loading, a load error or an empty book. */
  status?: ReactNode;
  /** Pinned under the list (e.g. "Manage addresses"). */
  footer?: ReactNode;
  testID: string;
}

/** A bottom sheet listing the address book as radio rows — label (+ default
 * tag) over the address line. Picking one hands it back and closes. Shared by
 * the checkout's address picker and the Pod Shop's "Deliver to" bar. */
export function AddressSheet({
  open,
  onClose,
  title,
  addresses,
  selectedId,
  onSelect,
  status,
  footer,
  testID,
}: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end">
          <YStack
            pressStyle={PRESS_STYLE.surface}
            testID={`${testID}-backdrop`}
            role="button"
            importantForAccessibility="no"
            aria-label={t('mweb.checkout.close')}
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            backgroundColor="$surface"
            borderTopLeftRadius={28}
            borderTopRightRadius={28}
            maxHeight="70%"
          >
            <ModalSafeArea edges={['bottom']} style={SHEET_SAFE_AREA}>
              <Text padding={16} fontSize={16} fontWeight="700" color="$color" role="heading">
                {title}
              </Text>
              <ScrollView>
                {status ?? (
                  <YStack paddingHorizontal={16} paddingBottom={16} gap={8} role="radiogroup">
                    {addresses.map((address) => {
                      const checked = address.id === selectedId;
                      return (
                        <XStack
                          key={address.id}
                          testID={`${testID}-option-${address.id}`}
                          role="radio"
                          aria-checked={checked}
                          tabIndex={0}
                          aria-label={address.label}
                          onPress={() => {
                            onSelect(address);
                            onClose();
                          }}
                          alignItems="center"
                          gap={10}
                          padding={12}
                          borderRadius={14}
                          borderWidth={1}
                          borderColor={checked ? primary : '$borderColor'}
                          backgroundColor={checked ? '$soft' : '$surface'}
                          pressStyle={PRESS_STYLE.control}
                        >
                          <MaterialIcons
                            name={checked ? 'radio-button-checked' : 'radio-button-unchecked'}
                            size={18}
                            color={checked ? primary : muted}
                          />
                          <YStack flex={1} gap={2}>
                            <Text fontSize={13} fontWeight="700" color="$color" numberOfLines={1}>
                              {address.is_default
                                ? `${address.label} ${t('mweb.checkout.addressDefault')}`
                                : address.label}
                            </Text>
                            <Text fontSize={12} color="$muted" numberOfLines={2}>
                              {deliveryAddressLine(address)}
                            </Text>
                          </YStack>
                        </XStack>
                      );
                    })}
                  </YStack>
                )}
              </ScrollView>
              {footer ? (
                <YStack paddingHorizontal={16} paddingBottom={16}>
                  {footer}
                </YStack>
              ) : null}
            </ModalSafeArea>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
