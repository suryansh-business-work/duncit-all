import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { IconButton } from '@/components/mobile/IconButton';
import { SearchBar } from '@/components/mobile/SearchBar';
import { MOBILE, RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  search: string;
  onSearch: (text: string) => void;
  total: number;
  filterCount: number;
  /** "Within 5 km of you" while a nearby search is on. */
  nearbyLabel: string | null;
  /** What just happened (deleted, created, imported), announced. */
  status: string | null;
  onFilters: () => void;
  /** Changes the nearby search (radius, place). */
  onNearby: () => void;
  onClearNearby: () => void;
}

const BADGE = 18;

/**
 * A lead listing's head, phone-sized: the search and a filter button (a count
 * badge while filters are on), the nearby search as a removable chip, what
 * just happened, and the count. The page's tools live in the app bar's ⋯
 * menu and New lead is the floating button, so the leads start near the top.
 */
export function LeadListHeader(props: Readonly<Props>) {
  const { nearbyLabel, filterCount } = props;
  const { t } = useTranslation();
  const theme = useTheme();
  const filtersLabel =
    filterCount > 0 ? `${t('shell.table.filters')} (${filterCount})` : t('shell.table.filters');
  return (
    <YStack gap="$2" marginBottom="$2">
      <XStack gap="$2" alignItems="center">
        <YStack flex={1}>
          <SearchBar
            value={props.search}
            onChange={props.onSearch}
            placeholder={t('crmApp.leads.search')}
            testID="lead-list-search"
          />
        </YStack>
        <YStack>
          <IconButton
            icon={{ name: 'tune' }}
            label={filtersLabel}
            variant={filterCount > 0 ? 'filled' : 'plain'}
            onPress={props.onFilters}
            testID="lead-list-filters"
          />
          {filterCount > 0 ? (
            <YStack
              position="absolute"
              top={2}
              right={2}
              minWidth={BADGE}
              height={BADGE}
              paddingHorizontal="$1"
              borderRadius={BADGE / 2}
              backgroundColor="$primary"
              alignItems="center"
              justifyContent="center"
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID="lead-list-filter-count"
            >
              <Text color="$onPrimary" fontSize={11} fontWeight="700">
                {filterCount}
              </Text>
            </YStack>
          ) : null}
        </YStack>
      </XStack>
      {nearbyLabel ? (
        <XStack testID="nearby-chip">
          <XStack
            alignItems="center"
            gap="$1.5"
            paddingLeft="$3"
            borderRadius={RADII.pill}
            backgroundColor="$primarySoft"
          >
            <MaterialIcons name="near-me" size={MOBILE.iconSm} color={theme.onPrimarySoft?.val} />
            <Text
              role="button"
              aria-label={nearbyLabel}
              onPress={props.onNearby}
              color="$onPrimarySoft"
              fontWeight="600"
              paddingVertical="$2"
              testID="nearby-change-open"
            >
              {nearbyLabel}
            </Text>
            <IconButton
              icon={{ name: 'close' }}
              label={t('crm.nearby.clear')}
              color={theme.onPrimarySoft?.val}
              onPress={props.onClearNearby}
              testID="nearby-clear"
            />
          </XStack>
        </XStack>
      ) : null}
      {props.status ? (
        <Text color="$success" aria-live="polite" testID="lead-list-status">
          {props.status}
        </Text>
      ) : null}
      {props.total > 0 ? (
        <Text color="$muted" fontSize="$2" aria-live="polite">
          {t('crmApp.leads.count', { count: props.total })}
        </Text>
      ) : null}
    </YStack>
  );
}
