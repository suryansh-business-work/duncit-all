import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import type { SearchCategory } from '@/hooks/useSearch';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  categories: SearchCategory[];
  onSelect: (categoryId: string) => void;
}

/** Emoji icons render directly; icon-names / image URLs fall back to a glyph. */
const emojiGlyph = (icon?: string | null) => {
  const value = (icon ?? '').trim();
  return value.length > 0 && value.length <= 2 ? value : null;
};

/** The default (nothing typed) search landing — quick-access category buttons so
 * users explore communities by interest instead of facing a blank screen. */
export function CategoryActions({ categories, onSelect }: Readonly<Props>) {
  const { primary } = useThemeColors();
  return (
    <YStack gap={12} testID="search-category-actions">
      <YStack gap={2}>
        <Text fontSize={17} fontWeight="900" color="$color">
          ✨ Discover Experiences by Interest
        </Text>
        <Text fontSize={13} color="$muted">
          Not sure what to search for? Explore communities by category and discover experiences
          happening around you.
        </Text>
      </YStack>
      {categories.length === 0 ? (
        <Text fontSize={13} color="$muted" testID="search-category-empty">
          Categories are on their way — check back soon.
        </Text>
      ) : (
        <XStack flexWrap="wrap" gap={10}>
          {categories.map((category) => (
            <PressScale
              key={category.id}
              testID={`search-cat-${category.id}`}
              accessibilityLabel={category.name}
              onPress={() => onSelect(category.id)}
            >
              <YStack
                width={104}
                alignItems="center"
                gap={6}
                padding={12}
                borderRadius={16}
                borderWidth={1}
                borderColor="$borderColor"
                backgroundColor="$surface"
              >
                {emojiGlyph(category.icon) ? (
                  <Text fontSize={22}>{emojiGlyph(category.icon)}</Text>
                ) : (
                  <MaterialIcons name="interests" size={22} color={primary} />
                )}
                <Text fontSize={12} fontWeight="800" color="$color" numberOfLines={1}>
                  {category.name}
                </Text>
              </YStack>
            </PressScale>
          ))}
        </XStack>
      )}
    </YStack>
  );
}
