import { useState } from 'react';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import {
  FOOD_DASHBOARD_DEFAULT_DAYS,
  PUBLIC_PAGE_RANGES,
  foodDishBars,
  foodDishLine,
  foodFeedbackByLine,
  foodOrderStatusLabel,
  foodStatTiles,
  foodStatusBars,
  formatCount,
} from '@duncit/utils';

import { ChoiceChip } from '@/components/brand-orders/ChoiceChip';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useFoodStats } from '@/hooks/useFoodDesk';
import { useTranslation } from '@/hooks/useTranslation';
import { FoodBar } from './FoodDeskBits';
import { FoodFeedbackView } from './FoodFeedbackView';

/**
 * One venue's food numbers for the picked period: the tiles, how the orders
 * ended, which dishes sold and what guests said. Every tile, share and line is
 * built by @duncit/utils, the same builders the web dashboard draws; the bars
 * are plain views, no chart library.
 */
export function VenueFoodDashboardBody({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const [days, setDays] = useState<number>(FOOD_DASHBOARD_DEFAULT_DAYS);
  const { stats, error, isLoading } = useFoodStats(venueId, days);

  return (
    <YStack gap={16} testID="food-dashboard">
      <XStack gap={8} flexWrap="wrap" role="radiogroup" aria-label={t('publicPage.stats.range')}>
        {PUBLIC_PAGE_RANGES.map((range) => (
          <ChoiceChip
            key={range.days}
            label={t(range.labelKey)}
            active={days === range.days}
            onPress={() => setDays(range.days)}
            testID={`food-dashboard-range-${range.days}`}
          />
        ))}
      </XStack>
      {isLoading && !stats ? (
        <Spinner
          role="progressbar"
          aria-label={t('venueFoodOwner.common.loading')}
          color="$primary"
        />
      ) : null}
      {error ? (
        <Text role="alert" testID="food-dashboard-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      {stats ? (
        <>
          {stats.orders === 0 ? (
            <Text role="status" testID="food-dashboard-empty" fontSize={14} color="$muted">
              {t('venueFoodOwner.dashboard.empty')}
            </Text>
          ) : null}
          <XStack gap={12} flexWrap="wrap">
            {foodStatTiles(stats, t).map((tile) => (
              <SurfaceCard
                key={tile.key}
                testID={`food-dashboard-tile-${tile.key}`}
                flexBasis="45%"
                flexGrow={1}
                gap={4}
              >
                <Text fontSize={12} fontWeight="700" color="$muted">
                  {tile.label}
                </Text>
                <Text fontSize={20} fontWeight="800" color="$color">
                  {tile.value}
                </Text>
                {tile.hint ? (
                  <Text fontSize={11} color="$muted">
                    {tile.hint}
                  </Text>
                ) : null}
              </SurfaceCard>
            ))}
          </XStack>
          {stats.orders > 0 ? (
            <>
              <SectionHeader title={t('venueFoodOwner.dashboard.byStatus')} />
              <SurfaceCard gap={12}>
                {foodStatusBars(stats).map((bar) => (
                  <FoodBar
                    key={bar.status}
                    label={foodOrderStatusLabel(t, bar.status)}
                    figure={formatCount(bar.count)}
                    percent={bar.percent}
                  />
                ))}
              </SurfaceCard>
              <SectionHeader title={t('venueFoodOwner.dashboard.topDishes')} />
              <SurfaceCard gap={12}>
                {stats.top_items.length === 0 ? (
                  <Text fontSize={13} color="$muted">
                    {t('venueFoodOwner.dashboard.noDishes')}
                  </Text>
                ) : null}
                {foodDishBars(stats.top_items).map((dish) => (
                  <FoodBar
                    key={dish.name}
                    label={dish.name}
                    figure={foodDishLine(t, dish, stats.currency_symbol)}
                    percent={dish.percent}
                  />
                ))}
              </SurfaceCard>
            </>
          ) : null}
          <SectionHeader title={t('venueFoodOwner.dashboard.recentFeedback')} />
          <SurfaceCard gap={14}>
            {stats.recent_feedback.length === 0 ? (
              <Text fontSize={13} color="$muted">
                {t('venueFoodOwner.dashboard.noFeedback')}
              </Text>
            ) : null}
            {stats.recent_feedback.map((row) => (
              <YStack key={row.order_no} gap={4}>
                <Text fontSize={13} fontWeight="700" color="$color">
                  {foodFeedbackByLine(t, row)}
                </Text>
                <Text fontSize={11} color="$muted">
                  {fmt.formatDateTime(row.submitted_at)}
                </Text>
                <FoodFeedbackView feedback={row} testID="food-dashboard-feedback-row" />
              </YStack>
            ))}
          </SurfaceCard>
        </>
      ) : null}
    </YStack>
  );
}
