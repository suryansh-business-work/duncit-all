import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

/** Amber "heads up" tint — the same warning weight the mWeb twin renders. */
const WARN = '#f59e0b';
const WARN_BG = 'rgba(245,158,11,0.10)';
const WARN_BORDER = 'rgba(245,158,11,0.40)';

/**
 * Shown under the Ticket Price field when the server projects a take-home of
 * ₹0 or less. Create Pod stays disabled while it is on screen; raising the
 * price clears it automatically. mWeb twin.
 */
export function ZeroEarningsNotice() {
  const { t } = useTranslation();
  return (
    <XStack
      testID="create-pod-zero-earnings"
      role="alert"
      gap={8}
      alignItems="flex-start"
      backgroundColor={WARN_BG}
      borderWidth={1}
      borderColor={WARN_BORDER}
      borderRadius={12}
      paddingHorizontal={10}
      paddingVertical={9}
    >
      <MaterialIcons name="info-outline" size={18} color={WARN} />
      <YStack flex={1} gap={3}>
        <Text fontSize={13} fontWeight="600" color="$color">
          {t('mweb.createPod.zeroEarningsTitle')}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('mweb.createPod.zeroEarningsBody')}
        </Text>
      </YStack>
    </XStack>
  );
}
