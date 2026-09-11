import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Sits above the Pod Reel card while the pod has no reel. The card is collapsed
 * by default, so the reason a reel is worth recording has to read from outside
 * it; adding one clears the notice. mWeb twin (rule 27).
 */
export function ReelEngagementNotice() {
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  return (
    <XStack
      testID="create-pod-reel-engagement"
      gap={10}
      alignItems="flex-start"
      backgroundColor="$primarySoft"
      borderRadius={16}
      padding={12}
    >
      <MaterialIcons name="lightbulb-outline" size={18} color={primary} />
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('mweb.createPod.reelEngagementTitle')}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('mweb.createPod.reelEngagementBody')}
        </Text>
      </YStack>
    </XStack>
  );
}
