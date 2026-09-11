import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { BarCta, BarLabel } from '@/components/details/BarLabel';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** "Backout in process": replacement search running — offer Keep My Spot.
 * Once a replacement is confirmed the backout is locked (no restore).
 * mWeb twin: pod-details-page/BackoutInProcessPanel. */
export function BackoutInProcessBar({
  canCancel,
  onKeepSpot,
}: Readonly<{ canCancel: boolean; onKeepSpot: () => void }>) {
  const { warning } = useThemeColors();
  const { t } = useTranslation();
  if (!canCancel) {
    return (
      <XStack flex={1} alignItems="center" gap={8} minHeight={48} testID="pod-backout-locked">
        <MaterialIcons name="lock-clock" size={20} color={warning} />
        <Text flex={1} fontSize={13} fontWeight="600" color="$muted">
          {t('mweb.podDetails.backoutLocked')}
        </Text>
      </XStack>
    );
  }
  return (
    <>
      <BarLabel
        icon="hourglass-top"
        iconColor={warning}
        caption={t('mweb.podDetails.searchingForReplacement')}
        value={t('mweb.podDetails.backoutInProcess')}
        valueTestID="pod-backout-in-process"
      />
      <BarCta testID="pod-keep-spot" label={t('mweb.podDetails.keepMySpot')} onPress={onKeepSpot} />
    </>
  );
}
