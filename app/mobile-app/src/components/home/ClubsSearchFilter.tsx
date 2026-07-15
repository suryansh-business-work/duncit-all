import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack, YStack } from 'tamagui';

import { OptionChipRow } from '@/components/home/HomeFilterParts';
import type { CategoryOption } from '@/hooks/useClubsFilter';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ClubsSearchFilterProps {
  query: string;
  onQueryChange: (value: string) => void;
  categoryId: string;
  categoryOptions: CategoryOption[];
  onCategoryChange: (id: string) => void;
}

/** Search box + horizontal category filter rail above the Clubs list. */
export function ClubsSearchFilter({
  query,
  onQueryChange,
  categoryId,
  categoryOptions,
  onCategoryChange,
}: Readonly<ClubsSearchFilterProps>) {
  const { muted } = useThemeColors();
  const options: CategoryOption[] = [['', 'All'], ...categoryOptions];

  return (
    <YStack gap={10} paddingHorizontal={16} paddingTop={12} paddingBottom={4}>
      <XStack
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        height={46}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      >
        <MaterialIcons name="search" size={20} color={muted} />
        <Input
          testID="clubs-search-input"
          aria-label="Search clubs"
          flex={1}
          unstyled
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search clubs by name or vibe…"
          placeholderTextColor="$muted"
          color="$color"
          fontSize={15}
          returnKeyType="search"
        />
      </XStack>

      {categoryOptions.length > 0 ? (
        <OptionChipRow
          testIDPrefix="clubs-filter-cat"
          options={options}
          value={categoryId}
          onSelect={onCategoryChange}
          layout="scroll"
        />
      ) : null}
    </YStack>
  );
}
