import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  filterCount: number;
  onFilter: () => void;
  onSort: () => void;
}

/** Header Filter + Sort buttons for Pod History (top-right). Filter shows a count
 * badge while a Super/Category filter is applied. */
export function PodHistoryToolbar({ filterCount, onFilter, onSort }: Readonly<Props>) {
  const { color, onPrimary } = useThemeColors();
  const { t } = useTranslation();
  const filterActive = filterCount > 0;
  return (
    <XStack gap={8} alignItems="center">
      <XStack
        testID="pod-history-filter-button"
        role="button"
        aria-label={t('mweb.podHistory.filter')}
        onPress={onFilter}
        alignItems="center"
        justifyContent="center"
        gap={4}
        minWidth={40}
        height={40}
        paddingHorizontal={filterActive ? 12 : 0}
        borderRadius={999}
        borderWidth={1}
        borderColor={filterActive ? '$primary' : '$cardBorder'}
        backgroundColor={filterActive ? '$primary' : '$surface'}
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="filter-list" size={20} color={filterActive ? onPrimary : color} />
        {filterActive ? (
          <Text fontSize={13} fontWeight="600" color="$onPrimary">
            {filterCount}
          </Text>
        ) : null}
      </XStack>
      <XStack
        testID="pod-history-sort-button"
        role="button"
        aria-label={t('mweb.podHistory.sort')}
        onPress={onSort}
        alignItems="center"
        justifyContent="center"
        width={40}
        height={40}
        borderRadius={999}
        borderWidth={1}
        borderColor="$cardBorder"
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="swap-vert" size={20} color={color} />
      </XStack>
    </XStack>
  );
}
