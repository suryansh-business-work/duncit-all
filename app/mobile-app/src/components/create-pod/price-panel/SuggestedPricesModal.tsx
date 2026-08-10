import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useSuggestedTicketPrices } from '@/hooks/useSuggestedTicketPrices';
import { SuggestedPricesTable } from './SuggestedPricesTable';

const NOTE_BG = 'rgba(99,102,241,0.10)';

interface Props {
  open: boolean;
  onClose: () => void;
  noOfSpots: number;
  venueId: string | null;
  venueAmount: number | null;
  symbol: string;
}

/**
 * "Suggested Ticket Prices" — the ₹x99 ladder with the host's projected payout
 * at each rung. Closes on the ✕, on a backdrop tap and on Esc / hardware back
 * (`onRequestClose`). The ladder is fetched only while the modal is open.
 * mWeb twin.
 */
export function SuggestedPricesModal({
  open,
  onClose,
  noOfSpots,
  venueId,
  venueAmount,
  symbol,
}: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  const close = t('mweb.auth.close');
  const { prices, isLoading, error } = useSuggestedTicketPrices(
    open,
    noOfSpots,
    venueId,
    venueAmount,
  );

  let body = <SuggestedPricesTable prices={prices} symbol={symbol} />;
  if (isLoading) {
    body = <Spinner testID="suggested-prices-loading" size="small" color="$primary" />;
  } else if (error) {
    body = (
      <Text testID="suggested-prices-error" fontSize={12.5} color="$danger">
        {t('mweb.createPod.suggestedPricesError')}
      </Text>
    );
  } else if (prices.length === 0) {
    body = (
      <Text testID="suggested-prices-empty" fontSize={12.5} color="$muted">
        {t('mweb.createPod.suggestedPricesEmpty')}
      </Text>
    );
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          testID="suggested-prices-modal"
        >
          <YStack
            testID="suggested-prices-backdrop"
            role="button"
            aria-label={close}
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            width="90%"
            maxWidth={460}
            maxHeight="85%"
            backgroundColor="$background"
            borderRadius={20}
            padding={16}
            gap={12}
          >
            <SafeAreaView edges={[]}>
              <XStack alignItems="center" justifyContent="space-between" gap={10}>
                <XStack alignItems="center" gap={8} flexShrink={1}>
                  <MaterialIcons name="sell" size={20} color={primary} />
                  <Text fontSize={16.5} fontWeight="700" color="$color" flexShrink={1}>
                    {t('mweb.createPod.suggestedPricesTitle')}
                  </Text>
                </XStack>
                <XStack
                  testID="suggested-prices-close"
                  role="button"
                  aria-label={close}
                  onPress={onClose}
                  width={32}
                  height={32}
                  alignItems="center"
                  justifyContent="center"
                  pressStyle={{ opacity: 0.6 }}
                >
                  <MaterialIcons name="close" size={20} color={muted} />
                </XStack>
              </XStack>
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap={12} paddingVertical={10}>
                  {body}
                  <YStack
                    testID="suggested-prices-note"
                    backgroundColor={NOTE_BG}
                    borderRadius={12}
                    padding={12}
                  >
                    <Text fontSize={12.5} fontWeight="700" color="$color">
                      {t('mweb.createPod.suggestedPricesNote')}
                    </Text>
                  </YStack>
                </YStack>
              </ScrollView>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
