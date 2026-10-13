import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Grid, MenuItem, Skeleton, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { PUBLIC_PAGE_RANGES, parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import FoodBreakdowns from './FoodBreakdowns';
import FoodDailyChart from './FoodDailyChart';
import FoodRecentFeedback from './FoodRecentFeedback';
import FoodStatTiles from './FoodStatTiles';
import { VENUE_FOOD_STATS } from './queries';

/** The period the dashboard opens on: the second choice, the last 30 days. */
const DEFAULT_DAYS = PUBLIC_PAGE_RANGES[1].days;
/** Placeholder tiles while the first answer is on its way — one row of the grid at its widest. */
const SKELETON_TILES = ['a', 'b', 'c', 'd'] as const;
const SKELETON_TILE_HEIGHT = 96;
const SKELETON_PANEL_HEIGHT = 220;

interface Props {
  venueId: string;
}

/** One venue's food numbers for the picked period: the tiles, the two breakdowns, the daily trend and recent feedback. */
export default function VenueFoodDashboard({ venueId }: Readonly<Props>) {
  const { t } = useTranslation();
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const { data, loading, error, refetch } = useQuery(VENUE_FOOD_STATS, {
    variables: { venue_id: venueId, days },
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.venueFoodStats;

  const period = (
    <TextField
      select
      size="small"
      label={t('publicPage.stats.range')}
      value={days}
      onChange={(event) => setDays(Number(event.target.value))}
      slotProps={{ htmlInput: { 'data-testid': 'food-dashboard-range' } }}
      sx={{ minWidth: 180, alignSelf: 'flex-start' }}
    >
      {PUBLIC_PAGE_RANGES.map((range) => (
        <MenuItem key={range.days} value={range.days}>
          {t(range.labelKey)}
        </MenuItem>
      ))}
    </TextField>
  );

  // A failed re-read keeps the last numbers on screen; only a read with nothing to show is the error state.
  if (error && !stats) {
    return (
      <Stack spacing={2}>
        {period}
        <Alert
          severity="error"
          data-testid="food-dashboard-error"
          action={
            <DuncitButton
              size="small"
              color="inherit"
              data-testid="food-dashboard-retry"
              onClick={() => fireAndForget(refetch(), logs.portal['partners-app'], 'venue-food-dashboard', 'refetch')}
            >
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {parseApiError(error)}
        </Alert>
      </Stack>
    );
  }

  if (!stats) {
    return (
      <Stack spacing={2} aria-busy={loading} data-testid="food-dashboard-loading">
        {period}
        <Grid container spacing={2}>
          {SKELETON_TILES.map((tile) => (
            <Grid key={tile} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Skeleton variant="rounded" height={SKELETON_TILE_HEIGHT} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={SKELETON_PANEL_HEIGHT} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2} data-testid="food-dashboard">
      {period}
      {error && <Alert severity="warning">{parseApiError(error)}</Alert>}
      {stats.orders === 0 && (
        <Alert severity="info" data-testid="food-dashboard-empty">
          {t('partners.foodDashboard.empty')}
        </Alert>
      )}
      <FoodStatTiles stats={stats} />
      {stats.orders > 0 && (
        <>
          <FoodBreakdowns stats={stats} />
          <FoodDailyChart daily={stats.daily} currencySymbol={stats.currency_symbol} />
        </>
      )}
      <FoodRecentFeedback feedback={stats.recent_feedback} />
    </Stack>
  );
}
