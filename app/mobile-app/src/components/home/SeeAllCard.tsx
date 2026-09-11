import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
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
 * right after the last entry shown here (rule-27 twin of mWeb's SeeAllCard).
 * As tall as a pod card so it closes the rail flush. */
export function SeeAllCard({ count, width = 200, height = 240, onPress, testID }: Readonly<Props>) {
  const { accent } = useThemeColors();
  const { t } = useTranslation();
  return (
    <SurfaceCard
      testID={testID}
      role="button"
      aria-label={t('mweb.home.seeAll')}
      onPress={onPress}
      width={width}
      height={height}
      alignItems="center"
      justifyContent="center"
      gap={8}
      pressStyle={PRESS_STYLE.surface}
    >
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name="arrow-forward" size={22} color={accent} />
      </YStack>
      <Text fontSize={14} fontWeight="600" color="$color">
        {t('mweb.home.seeAll')}
      </Text>
      {count !== undefined && (
        <Text fontSize={12} fontWeight="500" color="$muted">
          {t('mweb.home.morePods', { count })}
        </Text>
      )}
    </SurfaceCard>
  );
}
