import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { HomeCategory } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';

interface HomeVibeChipsProps {
  categories: HomeCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** "What's your vibe today?" category chip rail — RN port of HomeVibeChips.
 * Selecting a chip filters the feed to that category (toggles off when re-tapped). */
export function HomeVibeChips({ categories, selectedId, onSelect }: Readonly<HomeVibeChipsProps>) {
  const { primary } = useThemeColors();
  if (categories.length === 0) return null;

  return (
    <YStack gap={10}>
      <XStack alignItems="center" gap={6} paddingHorizontal={16}>
        <MaterialIcons name="auto-awesome" size={18} color={primary} />
        <Text fontSize={16} fontWeight="900" color="$color">
          What&apos;s your vibe today?
        </Text>
      </XStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {categories.slice(0, 16).map((category) => {
          const selected = selectedId === category.id;
          return (
            <XStack
              key={category.id}
              testID={`vibe-chip-${category.id}`}
              role="button"
              aria-label={category.name}
              aria-pressed={selected}
              onPress={() => onSelect(selected ? '' : category.id)}
              height={42}
              paddingHorizontal={16}
              alignItems="center"
              borderRadius={14}
              borderWidth={1.5}
              backgroundColor={selected ? '$primary' : '$surface'}
              borderColor={selected ? '$primary' : '$borderColor'}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={13.5} fontWeight="800" color={selected ? '$onPrimary' : '$color'}>
                {category.name}
              </Text>
            </XStack>
          );
        })}
      </ScrollView>
    </YStack>
  );
}
