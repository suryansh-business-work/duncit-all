import { Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { formatMoney } from '@/utils/checkout-math';

export interface VenueCharge {
  label: string;
  amount: number;
  note?: string | null;
}

interface Props {
  open: boolean;
  charges: readonly VenueCharge[];
  currency: string;
  onClose: () => void;
  testID?: string;
}

/** Info sheet explaining the venue-side charges shown on checkout. These are
 * paid directly at the venue and are NOT part of the online payable amount, so
 * this purely explains + itemises them. */
export function VenueChargesSheet({
  open,
  charges,
  currency,
  onClose,
  testID = 'venue-charges-sheet',
}: Readonly<Props>) {
  const total = charges.reduce((sum, charge) => sum + charge.amount, 0);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID={testID}>
          <YStack
            testID={`${testID}-backdrop`}
            role="button"
            aria-label="Close"
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            width="86%"
            maxWidth={420}
            backgroundColor="$background"
            borderRadius={20}
            padding={20}
            gap={10}
          >
            <SafeAreaView edges={[]}>
              <XStack alignItems="center" justifyContent="space-between">
                <XStack alignItems="center" gap={8}>
                  <MaterialIcons name="storefront" size={18} color="#ff4f73" />
                  <Text fontSize={17} fontWeight="900" color="$color">
                    Venue Charges
                  </Text>
                </XStack>
                <XStack
                  testID={`${testID}-close`}
                  role="button"
                  aria-label="Close"
                  onPress={onClose}
                  width={32}
                  height={32}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={16}
                  pressStyle={{ opacity: 0.6 }}
                >
                  <MaterialIcons name="close" size={20} color="#9aa0a6" />
                </XStack>
              </XStack>
              <Text fontSize={13.5} color="$muted" paddingTop={6}>
                Optional venue-side charges to be paid to the Venue.
              </Text>
              <YStack paddingTop={12} gap={8}>
                {charges.map((charge) => (
                  <XStack
                    key={`${charge.label}|${charge.amount}|${charge.note ?? ''}`}
                    justifyContent="space-between"
                    gap={12}
                  >
                    <YStack flex={1}>
                      <Text fontSize={13} fontWeight="700" color="$color">
                        {charge.label}
                      </Text>
                      {charge.note ? (
                        <Text fontSize={11.5} color="$muted">
                          {charge.note}
                        </Text>
                      ) : null}
                    </YStack>
                    <Text fontSize={13} fontWeight="800" color="$color">
                      {formatMoney(currency, charge.amount)}
                    </Text>
                  </XStack>
                ))}
                <YStack height={1} backgroundColor="$borderColor" marginVertical={2} />
                <XStack justifyContent="space-between">
                  <Text fontSize={13} fontWeight="900" color="$color">
                    Total venue charges
                  </Text>
                  <Text fontSize={13} fontWeight="900" color="$color">
                    {formatMoney(currency, total)}
                  </Text>
                </XStack>
              </YStack>
              <Text fontSize={11.5} color="$muted" paddingTop={12}>
                Pay this directly at the venue — it is not included in your online payment.
              </Text>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
