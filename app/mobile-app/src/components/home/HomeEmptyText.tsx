import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** The no-pods empty state — one accent icon on a soft disc and one line.
 * mWeb twin: HomeEmptyState. */
export function HomeEmptyText() {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  return (
    <Reveal index={4} scale>
      <YStack alignItems="center" gap={12} paddingHorizontal={24} paddingVertical={32}>
        <YStack
          width={48}
          height={48}
          borderRadius={24}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$soft"
        >
          <MaterialIcons name="event-busy" size={24} color={accent} />
        </YStack>
        <Text testID="home-empty" textAlign="center" fontSize={14} color="$muted">
          {t('mweb.home.homeEmpty')}
        </Text>
      </YStack>
    </Reveal>
  );
}
