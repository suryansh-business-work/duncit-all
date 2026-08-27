import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  /** How many more entries the full screen holds beyond the rail's cap.
   * Omitted when a vibe chip / filter is active — the full screen is
   * unfiltered, so a filtered count would lie. */
  count?: number;
  width?: number;
  height?: number;
  onPress: () => void;
  testID?: string;
}

/** Trailing rail card that continues the rail on its full-list screen, landing
 * right after the last entry shown here (rule-27 twin of mWeb's SeeAllCard). */
export function SeeAllCard({ count, width = 200, height = 230, onPress, testID }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={t('mweb.home.seeAll')}
      onPress={onPress}
      width={width}
      height={height}
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      alignItems="center"
      justifyContent="center"
      gap={8}
      pressStyle={PRESS_STYLE.control}
    >
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primary"
      >
        <MaterialIcons name="arrow-forward" size={22} color={onPrimary} />
      </YStack>
      <Text fontSize={14} fontWeight="700" color="$color">
        {t('mweb.home.seeAll')}
      </Text>
      {count !== undefined && (
        <Text fontSize={11} fontWeight="700" color="$muted">
          {t('mweb.home.morePods', { count })}
        </Text>
      )}
    </YStack>
  );
}
