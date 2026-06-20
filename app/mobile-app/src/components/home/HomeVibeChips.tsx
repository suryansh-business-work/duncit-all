import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { VibeCategory } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';

interface HomeVibeChipsProps {
  categories: VibeCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
}

interface VibeChipProps {
  testID: string;
  label: string;
  selected: boolean;
  small?: boolean;
  onPress: () => void;
}

function VibeChip({ testID, label, selected, small, onPress }: Readonly<VibeChipProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPress={onPress}
      height={small ? 36 : 42}
      paddingHorizontal={16}
      alignItems="center"
      borderRadius={14}
      borderWidth={1.5}
      backgroundColor={selected ? '$primary' : '$surface'}
      borderColor={selected ? '$primary' : '$borderColor'}
      pressStyle={{ opacity: 0.85 }}
    >
      <Text
        fontSize={small ? 12.5 : 13.5}
        fontWeight="800"
        color={selected ? '$onPrimary' : '$color'}
      >
        {label}
      </Text>
    </XStack>
  );
}

/** "What's your vibe today?" — Categories in row 1; the selected category's
 * Subcategories appear in a second row directly below (RN port of mWeb). */
export function HomeVibeChips({ categories, selectedId, onSelect }: Readonly<HomeVibeChipsProps>) {
  const { primary } = useThemeColors();
  if (categories.length === 0) return null;

  const activeCategory =
    categories.find((c) => c.id === selectedId || c.subs.some((s) => s.id === selectedId)) ?? null;
  const subs = activeCategory?.subs ?? [];

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
        <VibeChip
          testID="vibe-chip-all"
          label="All"
          selected={selectedId === ''}
          onPress={() => onSelect('')}
        />
        {categories.map((category) => {
          const selected =
            category.id === selectedId || category.subs.some((s) => s.id === selectedId);
          return (
            <VibeChip
              key={category.id}
              testID={`vibe-chip-${category.id}`}
              label={category.name}
              selected={selected}
              onPress={() => onSelect(category.id === selectedId ? '' : category.id)}
            />
          );
        })}
      </ScrollView>

      {activeCategory && subs.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          <VibeChip
            testID={`vibe-sub-all-${activeCategory.id}`}
            small
            label={`All ${activeCategory.name}`}
            selected={selectedId === activeCategory.id}
            onPress={() => onSelect(activeCategory.id)}
          />
          {subs.map((sub) => (
            <VibeChip
              key={sub.id}
              testID={`vibe-sub-${sub.id}`}
              small
              label={sub.name}
              selected={selectedId === sub.id}
              onPress={() => onSelect(selectedId === sub.id ? activeCategory.id : sub.id)}
            />
          ))}
        </ScrollView>
      )}
    </YStack>
  );
}
