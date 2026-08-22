import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { buildCommPreferenceLabels } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { color, muted } = useThemeColors();
  const labels = buildCommPreferenceLabels(t);

  return (
    <XStack
      testID="comm-preference-entry"
      role="button"
      aria-label={labels.title}
      onPress={onPress}
      padding={16}
      borderRadius={18}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      alignItems="center"
      gap={12}
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name="forum" size={20} color={color} />
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="800" color="$color">
          {labels.title}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {labels.entryHint}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}
