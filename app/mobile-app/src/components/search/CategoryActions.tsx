import { useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { SearchCategory } from '@/hooks/useSearch';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  categories: SearchCategory[];
  onSelect: (categoryId: string) => void;
}

const COLUMNS = 3;
const GAP = 12;
const SIDE_PADDING = 16;

/** Emoji icons render directly; icon-names / image URLs fall back to a glyph. */
const emojiGlyph = (icon?: string | null) => {
  const value = (icon ?? '').trim();
  return value.length > 0 && value.length <= 2 ? value : null;
};

/** The default (nothing typed) search landing — quick-access category tiles so
 * users explore communities by interest instead of facing a blank screen. */
export function CategoryActions({ categories, onSelect }: Readonly<Props>) {
  const { accent } = useThemeColors();
  const { width } = useWindowDimensions();
  // Three tiles to a row, filling the width — the same grid mWeb's auto-fill
  // lands on at phone width.
  const tileWidth = Math.floor((width - SIDE_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  return (
    <YStack gap={12} testID="search-category-actions">
      <SectionHeader title="Discover Experiences by Interest" />
      {categories.length === 0 ? (
        <Text fontSize={13} color="$muted" testID="search-category-empty">
          Categories are on their way — check back soon.
        </Text>
      ) : (
        <XStack flexWrap="wrap" gap={GAP}>
          {categories.map((category) => {
            const glyph = emojiGlyph(category.icon);
            return (
              <PressScale
                key={category.id}
                testID={`search-cat-${category.id}`}
                accessibilityLabel={category.name}
                onPress={() => onSelect(category.id)}
              >
                <SurfaceCard width={tileWidth} alignItems="center" gap={8}>
                  <YStack
                    width={44}
                    height={44}
                    borderRadius={22}
                    backgroundColor="$soft"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {glyph ? (
                      <Text fontSize={22}>{glyph}</Text>
                    ) : (
                      <MaterialIcons name="interests" size={22} color={accent} />
                    )}
                  </YStack>
                  <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
                    {category.name}
                  </Text>
                </SurfaceCard>
              </PressScale>
            );
          })}
        </XStack>
      )}
    </YStack>
  );
}
