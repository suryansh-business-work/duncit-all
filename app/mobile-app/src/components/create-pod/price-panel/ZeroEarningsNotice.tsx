import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { withAlpha } from '@/constants/survey-palette';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Shown under the Ticket Price field when the server projects a take-home of
 * ₹0 or less. Create Pod stays disabled while it is on screen; raising the
 * price clears it automatically. The amber tint is the theme's `warning` at
 * low alpha — the same weight as the mWeb twin.
 */
export function ZeroEarningsNotice() {
  const { warning } = useThemeColors();
  const { t } = useTranslation();
  return (
    <XStack
      testID="create-pod-zero-earnings"
      role="alert"
      gap={10}
      alignItems="flex-start"
      backgroundColor={withAlpha(warning, 0.12)}
      borderRadius={16}
      padding={12}
    >
      <MaterialIcons name="info-outline" size={18} color={warning} />
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('mweb.createPod.zeroEarningsTitle')}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('mweb.createPod.zeroEarningsBody')}
        </Text>
      </YStack>
    </XStack>
  );
}
