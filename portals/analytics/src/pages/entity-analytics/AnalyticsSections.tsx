import type { ReactNode } from 'react';
import { Grid, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import KpiTiles from './KpiTiles';
import TrendChart from './TrendChart';
import BreakdownChart from './BreakdownChart';
import LeaderboardTable from './LeaderboardTable';
import type { EntityAnalytics } from './queries';

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Stack component="section" spacing={1.5} aria-label={title}>
      <Typography variant="overline" component="h2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

/** A trend that would sit alone on its row takes the whole row. */
const trendWidth = (index: number, count: number) => (count % 2 === 1 && index === count - 1 ? 12 : 6);

/**
 * An Analytics page's body, top to bottom: the headline numbers, how they
 * moved over the period, what they split into, and the period's top ten.
 */
export default function AnalyticsSections({ board }: Readonly<{ board: EntityAnalytics }>) {
  const { t } = useTranslation();
  const { kpis, trends, breakdowns, leaderboard, period } = board;
  return (
    <Stack spacing={3}>
      <Section title={t('analytics.page.overview')}>
        <KpiTiles kpis={kpis} days={period.days} />
      </Section>
      {trends.length > 0 && (
        <Section title={t('analytics.page.trends')}>
          <Grid container spacing={2}>
            {trends.map((trend, index) => (
              <Grid key={trend.key} size={{ xs: 12, lg: trendWidth(index, trends.length) }}>
                <TrendChart trend={trend} />
              </Grid>
            ))}
          </Grid>
        </Section>
      )}
      {breakdowns.length > 0 && (
        <Section title={t('analytics.page.breakdowns')}>
          <Grid container spacing={2}>
            {breakdowns.map((breakdown) => (
              <Grid key={breakdown.key} size={{ xs: 12, md: 6, xl: 4 }}>
                <BreakdownChart breakdown={breakdown} />
              </Grid>
            ))}
          </Grid>
        </Section>
      )}
      {leaderboard && <LeaderboardTable leaderboard={leaderboard} />}
    </Stack>
  );
}
