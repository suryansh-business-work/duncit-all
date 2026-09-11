import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import { buildCommPreferenceLabels } from '@duncit/utils';

import { IconDisc } from '@/components/account/IconDisc';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  onPress: () => void;
}

/**
 * Profile Settings → Communication Preferences: ONE row, not three cards.
 * Tamagui twin of mWeb's CommPreferenceEntryCard (rule 27).
 *
 * Profile Settings is a list of subjects, and "where Duncit messages you" is
 * one subject. Expanding it inline made the longest block on the screen out of
 * the settings the fewest people change, and put a switch two scrolls above
 * the screen that owns the rest of that channel. The row is a door; everything
 * behind it is on the other side of it.
 */
export function CommPreferenceEntryCard({ onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const labels = buildCommPreferenceLabels(t);

  return (
    <SurfaceCard
      testID="comm-preference-entry"
      role="button"
      aria-label={labels.title}
      onPress={onPress}
      flexDirection="row"
      alignItems="center"
      gap={16}
      paddingVertical={14}
      pressStyle={PRESS_STYLE.surface}
    >
      <IconDisc icon="forum" />
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="500" color="$color">
          {labels.title}
        </Text>
        <Text fontSize={14} color="$muted">
          {labels.entryHint}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </SurfaceCard>
  );
}
