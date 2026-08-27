import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** "Backout in process": replacement search running — offer Keep My Spot.
 * Once a replacement is confirmed the backout is locked (no restore). */
export function BackoutInProcessBar({
  canCancel,
  onKeepSpot,
}: Readonly<{ canCancel: boolean; onKeepSpot: () => void }>) {
  const { t } = useTranslation();
  if (!canCancel) {
    return (
      <XStack flex={1} alignItems="center" gap={8} testID="pod-backout-locked">
        <MaterialIcons name="lock-clock" size={20} color={semantic.warning} />
        <Text flex={1} fontSize={13} fontWeight="600" color="$muted">
          {t('mweb.podDetails.backoutLocked')}
        </Text>
      </XStack>
    );
  }
  return (
    <>
      <XStack flex={1} alignItems="center" gap={8}>
        <MaterialIcons name="hourglass-top" size={22} color={semantic.warning} />
        <YStack flex={1}>
          <Text fontSize={11} color="$muted">
            {t('mweb.podDetails.searchingForReplacement')}
          </Text>
          <Text fontSize={15} fontWeight="700" color="$color" testID="pod-backout-in-process">
            {t('mweb.podDetails.backoutInProcess')}
          </Text>
        </YStack>
      </XStack>
      <XStack
        testID="pod-keep-spot"
        role="button"
        aria-label={t('mweb.podDetails.keepMySpot')}
        onPress={onKeepSpot}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={20}
        height={48}
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={PRESS_STYLE.control}
      >
        <KeepSpotLabel />
      </XStack>
    </>
  );
}

/** Hoisted so the themed label doesn't create a branch inside the bar. */
function KeepSpotLabel() {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  return (
    <Text fontSize={14} fontWeight="700" color={onPrimary}>
      {t('mweb.podDetails.keepMySpot')}
    </Text>
  );
}
