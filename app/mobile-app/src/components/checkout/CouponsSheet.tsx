import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { AvailableCoupon } from '@/hooks/useCheckout';

interface Props {
  open: boolean;
  coupons: AvailableCoupon[];
  currency: string;
  onClose: () => void;
  onPick: (code: string) => void;
}

/** Available-coupons picker for the native checkout — lists active global + pod
 * coupons from the admin panel; tapping one applies it (B2-#3). */
export function CouponsSheet({ open, coupons, currency, onClose, onPick }: Readonly<Props>) {
  const { color } = useThemeColors();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="coupons-sheet">
          <YStack
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
            backgroundColor="$background"
            borderTopLeftRadius={22}
            borderTopRightRadius={22}
            maxHeight="70%"
            padding={16}
          >
            <SafeAreaView edges={['bottom']}>
              <XStack alignItems="center" justifyContent="space-between" paddingBottom={12}>
                <Text fontSize={17} fontWeight="900" color="$color">
                  Available coupons
                </Text>
                <XStack
                  testID="coupons-sheet-close"
                  role="button"
                  aria-label="Close coupons"
                  onPress={onClose}
                  pressStyle={{ opacity: 0.6 }}
                >
                  <MaterialIcons name="close" size={22} color={color} />
                </XStack>
              </XStack>
              {coupons.length === 0 ? (
                <Text testID="coupons-empty" fontSize={13.5} color="$muted" paddingVertical={20}>
                  No coupons available right now.
                </Text>
              ) : (
                <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
                  {coupons.map((coupon) => (
                    <XStack
                      key={coupon.id}
                      testID={`coupon-pick-${coupon.code}`}
                      role="button"
                      aria-label={`Apply ${coupon.code}`}
                      onPress={() => onPick(coupon.code)}
                      alignItems="center"
                      gap={12}
                      padding={12}
                      borderRadius={12}
                      borderWidth={1}
                      borderColor="$primary"
                      borderStyle="dashed"
                      pressStyle={{ opacity: 0.85 }}
                    >
                      <MaterialIcons name="local-offer" size={20} color="#22c55e" />
                      <YStack flex={1}>
                        <Text fontSize={14.5} fontWeight="900" color="$color">
                          {coupon.code} · {coupon.discount_pct}% off
                        </Text>
                        <Text fontSize={12} color="$muted">
                          {coupon.description ||
                            (coupon.scope === 'POD' ? 'For this pod' : 'All pods')}
                          {coupon.min_order_amount > 0
                            ? ` · Min ${currency}${coupon.min_order_amount}`
                            : ''}
                        </Text>
                      </YStack>
                    </XStack>
                  ))}
                </ScrollView>
              )}
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
