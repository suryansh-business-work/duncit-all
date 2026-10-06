import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';
import {
  PUBLIC_PAGE_RANGES,
  publicPageTiles,
  type PublicPageBreakdown,
  type PublicPageInsights,
} from '@duncit/utils';

import { FilterChip } from '@/components/home/HomeFilterParts';
import { StatTile } from '@/components/studio/StatTile';
import { useTranslation } from '@/hooks/useTranslation';

/** Tiles per row on a phone. */
const TILES_PER_ROW = 2;
/** Rows listed under each breakdown. */
const TOP_ROWS = 5;

interface Props {
  insights: PublicPageInsights;
  days: number;
  onDaysChange: (days: number) => void;
  /** A new period is loading while the previous numbers stay up. */
  refreshing: boolean;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function Breakdown({
  title,
  rows,
  testID,
}: Readonly<{ title: string; rows: PublicPageBreakdown[]; testID: string }>) {
  if (rows.length === 0) return null;
  return (
    <YStack testID={testID} gap={6}>
      <Text role="heading" fontSize={13} fontWeight="600" color="$muted">
        {title}
      </Text>
      {rows.slice(0, TOP_ROWS).map((row) => (
        <XStack key={row.label} testID={`${testID}-row`} justifyContent="space-between" gap={8}>
          <Text flex={1} fontSize={14} color="$color" numberOfLines={1}>
            {row.label}
          </Text>
          <Text fontSize={14} fontWeight="600" color="$color">
            {row.count}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}

/**
 * The page's tracking numbers for the picked period: opens, unique visitors,
 * how far they went (signed up, opened a pod, booked), the booking rate, and
 * where they came from. Tiles and ranges come from @duncit/utils so mWeb and
 * the app show the same numbers under the same keys (rule 27).
 */
export function PublicPageStatsPanel({
  insights,
  days,
  onDaysChange,
  refreshing,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const tiles = publicPageTiles(insights);
  const empty = (insights.stats?.total_clicks ?? 0) === 0;

  return (
    <YStack testID="public-page-stats" gap={12}>
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text role="heading" fontSize={16} fontWeight="600" color="$color">
          {t('publicPage.stats.title')}
        </Text>
        {refreshing ? (
          <Spinner
            testID="public-page-stats-loading"
            role="progressbar"
            aria-label={t('mweb.a11y.loading')}
            color="$primary"
          />
        ) : null}
      </XStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        testID="public-page-range"
        aria-label={t('publicPage.stats.range')}
      >
        <XStack gap={8}>
          {PUBLIC_PAGE_RANGES.map((range) => (
            <FilterChip
              key={range.days}
              testID={`public-page-range-${range.days}`}
              label={t(range.labelKey)}
              selected={range.days === days}
              onPress={() => onDaysChange(range.days)}
              onPage
            />
          ))}
        </XStack>
      </ScrollView>
      <YStack gap={10}>
        {chunk(tiles, TILES_PER_ROW).map((row) => (
          <XStack key={row.map((tile) => tile.key).join('-')} gap={10}>
            {row.map((tile) => (
              <StatTile
                key={tile.key}
                testID={`public-page-stat-${tile.key}`}
                label={t(tile.labelKey)}
                value={tile.value}
              />
            ))}
          </XStack>
        ))}
      </YStack>
      {empty ? (
        <Text testID="public-page-stats-empty" fontSize={14} color="$muted">
          {t('publicPage.stats.empty')}
        </Text>
      ) : (
        <>
          <Breakdown
            testID="public-page-sources"
            title={t('publicPage.stats.topSources')}
            rows={insights.stats?.platforms ?? []}
          />
          <Breakdown
            testID="public-page-cities"
            title={t('publicPage.stats.topCities')}
            rows={insights.stats?.cities ?? []}
          />
        </>
      )}
    </YStack>
  );
}
