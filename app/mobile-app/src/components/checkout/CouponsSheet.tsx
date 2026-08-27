import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { AvailableCoupon } from '@/hooks/useCheckout';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** The coupon's minimum order as the sheet has always printed it — symbol then
 * amount, hoisted so the row below never nests one template inside another. */
const minOrderAmount = (currency: string, amount: number) => `${currency}${amount}`;

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
  const { color, success } = useThemeColors();
  const { t } = useTranslation();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} justifyContent="flex-end" testID="coupons-sheet">
            <YStack
              pressStyle={PRESS_STYLE.surface}
              role="button"
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
              backgroundColor="$background"
              borderTopLeftRadius={22}
              borderTopRightRadius={22}
              maxHeight="70%"
              padding={16}
            >
              <SafeAreaView edges={['bottom']} style={SHEET_SAFE_AREA}>
                <XStack alignItems="center" justifyContent="space-between" paddingBottom={12}>
                  <Text fontSize={17} fontWeight="700" color="$color">
                    {t('mweb.checkout.couponsTitle')}
                  </Text>
                  <XStack
                    testID="coupons-sheet-close"
                    role="button"
                    aria-label={t('mweb.checkout.couponsClose')}
                    onPress={onClose}
                    pressStyle={PRESS_STYLE.inline}
                  >
                    <MaterialIcons name="close" size={22} color={color} />
                  </XStack>
                </XStack>
                {coupons.length === 0 ? (
                  <Text testID="coupons-empty" fontSize={13.5} color="$muted" paddingVertical={20}>
                    {t('mweb.checkout.couponsEmpty')}
                  </Text>
                ) : (
                  <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
                    {coupons.map((coupon) => (
                      <XStack
                        key={coupon.id}
                        testID={`coupon-pick-${coupon.code}`}
                        role="button"
                        aria-label={t('mweb.checkout.couponPickAria', {
                          vars: { code: coupon.code },
                        })}
                        onPress={() => onPick(coupon.code)}
                        alignItems="center"
                        gap={12}
                        padding={12}
                        borderRadius={12}
                        borderWidth={1}
                        borderColor="$primary"
                        borderStyle="dashed"
                        pressStyle={PRESS_STYLE.control}
                      >
                        <MaterialIcons name="local-offer" size={20} color={success} />
                        <YStack flex={1}>
                          <Text fontSize={14.5} fontWeight="700" color="$color">
                            {coupon.code} ·{' '}
                            {t('mweb.checkout.couponPercentOff', {
                              vars: { pct: coupon.discount_pct },
                            })}
                          </Text>
                          <Text fontSize={12} color="$muted">
                            {coupon.description ||
                              (coupon.scope === 'POD'
                                ? t('mweb.checkout.couponForPod')
                                : t('mweb.checkout.couponAllPods'))}
                            {coupon.min_order_amount > 0
                              ? ` · ${t('mweb.checkout.couponMin', { vars: { amount: minOrderAmount(currency, coupon.min_order_amount) } })}`
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
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
