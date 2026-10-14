import type { ReactNode } from 'react';
import { Card, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { formatCount, formatFoodMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { FOOD_ORDER_STATUS_COLORS, foodOrderStatusLabel } from '../venue-food-orders-page/food-order-labels';
import { foodDishBars, foodStatusBars } from './food-dashboard';
import type { FoodStats } from './queries';

const BAR_SX = { height: 8, borderRadius: 999 } as const;

/** The chip palette's neutral has no progress-bar twin; it takes the text colour instead. */
const barColor = (status: string) => {
  const color = FOOD_ORDER_STATUS_COLORS[status];
  return color === undefined || color === 'default' ? 'inherit' : color;
};

interface BarRowProps {
  label: string;
  figure: string;
  percent: number;
  color: ReturnType<typeof barColor>;
  /** What a screen reader hears for the bar: the label with its number. */
  ariaLabel: string;
}

function BarRow({ label, figure, percent, color, ariaLabel }: Readonly<BarRowProps>) {
  return (
    <Stack spacing={0.5} component="li">
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
        <Typography variant="caption" noWrap sx={{ fontWeight: 800 }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {figure}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={percent} color={color} aria-label={ariaLabel} sx={BAR_SX} />
    </Stack>
  );
}

function Panel({ title, testId, children }: Readonly<{ title: string; testId: string; children: ReactNode }>) {
  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }} data-testid={testId}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        {children}
      </Stack>
    </Card>
  );
}

const LIST_SX = { listStyle: 'none', m: 0, p: 0 } as const;

/**
 * How the period's orders ended, and which dishes sold. Status bars are shares
 * of every order; dish bars are shares of the best seller, so the top dish
 * fills its row and the rest read against it. Drawn from the palette rather
 * than a chart library, like the dashboards next door.
 */
export default function FoodBreakdowns({ stats }: Readonly<{ stats: FoodStats }>) {
  const { t } = useTranslation();
  const dishes = foodDishBars(stats.top_items);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Panel title={t('partners.foodDashboard.byStatus')} testId="food-dashboard-status">
          <Stack spacing={1.5} component="ul" sx={LIST_SX}>
            {foodStatusBars(stats).map((bar) => {
              const label = foodOrderStatusLabel(t, bar.status);
              const count = formatCount(bar.count);
              return (
                <BarRow
                  key={bar.status}
                  label={label}
                  figure={count}
                  percent={bar.percent}
                  color={barColor(bar.status)}
                  ariaLabel={t('partners.foodDashboard.statusShare', { vars: { status: label, count } })}
                />
              );
            })}
          </Stack>
        </Panel>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Panel title={t('partners.foodDashboard.topDishes')} testId="food-dashboard-dishes">
          {dishes.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('partners.foodDashboard.noDishes')}
            </Typography>
          ) : (
            <Stack spacing={1.5} component="ul" sx={LIST_SX}>
              {dishes.map((dish) => {
                const figure = t('partners.foodDashboard.dishLine', {
                  vars: { qty: formatCount(dish.quantity), revenue: formatFoodMoney(dish.revenue, stats.currency_symbol) },
                });
                return (
                  <BarRow
                    key={dish.name}
                    label={dish.name}
                    figure={figure}
                    percent={dish.percent}
                    color="primary"
                    ariaLabel={t('partners.foodDashboard.statusShare', { vars: { status: dish.name, count: figure } })}
                  />
                );
              })}
            </Stack>
          )}
        </Panel>
      </Grid>
    </Grid>
  );
}
