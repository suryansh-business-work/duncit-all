import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  filterCount: number;
  onFilter: () => void;
  onSort: () => void;
}

/** Header Filter + Sort buttons for Pod History (top-right). Filter shows a count
 * badge while a Super/Category filter is applied. */
export function PodHistoryToolbar({ filterCount, onFilter, onSort }: Readonly<Props>) {
  const { color, onPrimary } = useThemeColors();
  const filterActive = filterCount > 0;
  return (
    <XStack gap={8} alignItems="center">
      <XStack
        testID="pod-history-filter-button"
        role="button"
        aria-label="Filter"
        onPress={onFilter}
        alignItems="center"
        gap={4}
        height={34}
        paddingHorizontal={12}
        borderRadius={999}
        borderWidth={1}
        borderColor={filterActive ? '$primary' : '$borderColor'}
        backgroundColor={filterActive ? '$primary' : '$surface'}
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name="filter-list" size={16} color={filterActive ? onPrimary : color} />
        {filterActive ? (
          <Text fontSize={12.5} fontWeight="900" color="$onPrimary">
            {filterCount}
          </Text>
        ) : null}
      </XStack>
      <XStack
        testID="pod-history-sort-button"
        role="button"
        aria-label="Sort"
        onPress={onSort}
        alignItems="center"
        justifyContent="center"
        width={34}
        height={34}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name="swap-vert" size={16} color={color} />
      </XStack>
    </XStack>
  );
}
