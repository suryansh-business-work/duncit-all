import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { SuperCategoryGroup } from '@duncit/utils';

import { PressScale } from '@/animations/PressScale';
import { AppImage } from '@/components/AppImage';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { SearchCategory } from '@/hooks/useSearch';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  groups: SuperCategoryGroup<SearchCategory>[];
  onSelect: (categoryId: string) => void;
}

const COLUMNS = 3;
const GAP = 12;
const SIDE_PADDING = 16;

interface MarkProps {
  testID: string;
  icon?: string | null;
  size: number;
  tint: string;
}

/** A category `icon`: the admin's image for a URL, an emoji for a short string,
 * else a MaterialIcons glyph (mWeb twin: renderSuperCategoryMark). */
function CategoryMark({ testID, icon, size, tint }: Readonly<MarkProps>) {
  const [failed, setFailed] = useState(false);
  const value = (icon ?? '').trim();
  if (value.startsWith('http') && !failed) {
    return (
      <AppImage
        testID={`${testID}-image`}
        source={{ uri: value }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }
  if (value.length > 0 && value.length <= 2) {
    return <Text fontSize={size}>{value}</Text>;
  }
  return <MaterialIcons name="interests" size={size} color={tint} />;
}

interface TileProps {
  category: SearchCategory;
  width: number;
  tint: string;
  onSelect: (categoryId: string) => void;
}

/** One category tile: its icon in a soft circle over its name. */
function CategoryTile({ category, width, tint, onSelect }: Readonly<TileProps>) {
  const testID = `search-cat-${category.id}`;
  return (
    <PressScale
      testID={testID}
      accessibilityLabel={category.name}
      onPress={() => onSelect(category.id)}
    >
      <SurfaceCard width={width} alignItems="center" gap={8}>
        <YStack
          width={44}
          height={44}
          borderRadius={22}
          backgroundColor="$soft"
          alignItems="center"
          justifyContent="center"
        >
          <CategoryMark testID={testID} icon={category.icon} size={22} tint={tint} />
        </YStack>
        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
          {category.name}
        </Text>
      </SurfaceCard>
    </PressScale>
  );
}

interface GroupProps {
  group: SuperCategoryGroup<SearchCategory>;
  tileWidth: number;
  tint: string;
  onSelect: (categoryId: string) => void;
}

/** A super category's heading (its icon + name) and the category tiles under it. */
function SuperCategorySection({ group, tileWidth, tint, onSelect }: Readonly<GroupProps>) {
  const { superCategory, categories } = group;
  const testID = `search-cat-group-${superCategory.id}`;
  return (
    <YStack gap={10} testID={testID}>
      <XStack alignItems="center" gap={8}>
        {superCategory.icon ? (
          <CategoryMark testID={testID} icon={superCategory.icon} size={18} tint={tint} />
        ) : null}
        <Text role="heading" fontSize={15} fontWeight="600" color="$color">
          {superCategory.name}
        </Text>
      </XStack>
      <XStack flexWrap="wrap" gap={GAP}>
        {categories.map((category) => (
          <CategoryTile
            key={category.id}
            category={category}
            width={tileWidth}
            tint={tint}
            onSelect={onSelect}
          />
        ))}
      </XStack>
    </YStack>
  );
}

/** The default (nothing typed) search landing — category tiles grouped under
 * their super category, so users explore communities by interest instead of
 * facing a blank screen. */
export function CategoryActions({ groups, onSelect }: Readonly<Props>) {
  const { accent } = useThemeColors();
  const { width } = useWindowDimensions();
  // Three tiles to a row, filling the width — the same grid mWeb's auto-fill
  // lands on at phone width.
  const tileWidth = Math.floor((width - SIDE_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  return (
    <YStack gap={12} testID="search-category-actions">
      <SectionHeader title="Discover Experiences by Interest" />
      {groups.length === 0 ? (
        <Text fontSize={13} color="$muted" testID="search-category-empty">
          Categories are on their way — check back soon.
        </Text>
      ) : (
        <YStack gap={20}>
          {groups.map((group) => (
            <SuperCategorySection
              key={group.superCategory.id}
              group={group}
              tileWidth={tileWidth}
              tint={accent}
              onSelect={onSelect}
            />
          ))}
        </YStack>
      )}
    </YStack>
  );
}
