import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  filterCount: number;
  onFilter: () => void;
  onSort: () => void;
}

const SIZE = 48;

/** The round green Filter and round surface Sort beside the Saved Items search
 * pill. Filter carries a coral count badge while a Super/Category/Sub filter is
 * applied. mWeb twin: SavedItemsToolbar. */
export function SavedToolbar({ filterCount, onFilter, onSort }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color, onPrimary } = useThemeColors();
  const filterActive = filterCount > 0;
  return (
    <XStack gap={8} alignItems="center">
      <XStack
        testID="saved-filter-button"
        role="button"
        aria-label={t('mweb.common.filter')}
        onPress={onFilter}
        alignItems="center"
        justifyContent="center"
        width={SIZE}
        height={SIZE}
        borderRadius={SIZE / 2}
        backgroundColor="$primary"
        pressStyle={PRESS_STYLE.solid}
      >
        <MaterialIcons name="tune" size={20} color={onPrimary} />
        {filterActive ? (
          <YStack
            position="absolute"
            top={-2}
            right={-2}
            minWidth={18}
            height={18}
            paddingHorizontal={4}
            borderRadius={9}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$accent"
          >
            <Text fontSize={10} fontWeight="600" color="$onPrimary">
              {filterCount}
            </Text>
          </YStack>
        ) : null}
      </XStack>
      <XStack
        testID="saved-sort-button"
        role="button"
        aria-label={t('mweb.common.sort')}
        onPress={onSort}
        alignItems="center"
        justifyContent="center"
        width={SIZE}
        height={SIZE}
        borderRadius={SIZE / 2}
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
