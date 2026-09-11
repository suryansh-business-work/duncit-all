import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { HomeFilterButton } from '@/components/home/HomeFilterButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { TourAnchor } from '@/tours/TourAnchor';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  /** Active filters — the badge on the round button. */
  filterCount: number;
  /** No clubs/pods to filter. */
  filterDisabled: boolean;
  /** Opens the Search screen, as the header's search button did. */
  onSearch: () => void;
  onOpenFilters: () => void;
}

/** Home's first row: the pill search launcher and, beside it, the round green
 * filter button that opens the filter sheet. mWeb twin: HomePage's search row
 * (HomeSearch + FilterMenu `round`). */
export function HomeSearchRow({
  filterCount,
  filterDisabled,
  onSearch,
  onOpenFilters,
}: Readonly<Props>) {
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  return (
    <XStack alignItems="center" gap={10} paddingHorizontal={16}>
      {/* The flex lives on this wrapper, not the pill: a running tour wraps its
          target in a plain View, which would collapse a flexed child. */}
      <YStack flex={1}>
        <TourAnchor tour="home" anchor="home-search">
          <XStack
            testID="home-search"
            role="button"
            aria-label={t('mweb.appHeader.searchPods')}
            onPress={onSearch}
            height={52}
            alignItems="center"
            gap={10}
            paddingHorizontal={18}
            borderRadius={999}
            borderWidth={1}
            borderColor="$cardBorder"
            backgroundColor="$surface"
            pressStyle={PRESS_STYLE.surface}
          >
            <MaterialIcons name="search" size={22} color={muted} />
            <Text flex={1} fontSize={14} fontWeight="500" color="$muted" numberOfLines={1}>
              {t('mweb.home.searchPods')}
            </Text>
          </XStack>
        </TourAnchor>
      </YStack>
      <TourAnchor tour="home" anchor="home-filters">
        <HomeFilterButton
          round
          count={filterCount}
          disabled={filterDisabled}
          onPress={onOpenFilters}
        />
      </TourAnchor>
    </XStack>
  );
}
