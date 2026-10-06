import { Box, List, ListItem, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { StatCard } from '@duncit/ui';
import {
  PUBLIC_PAGE_RANGES,
  publicPageTiles,
  type PublicPageBreakdown,
  type PublicPageInsights,
} from '@duncit/utils';

interface Props {
  insights: PublicPageInsights;
  days: number;
  onDaysChange: (days: number) => void;
}

const TOP_ROWS = 5;

function BreakdownList({ title, rows, testId }: Readonly<{ title: string; rows: PublicPageBreakdown[]; testId: string }>) {
  if (rows.length === 0) return null;
  return (
    <Box data-testid={testId} sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="subtitle2" component="h4">
        {title}
      </Typography>
      <List dense disablePadding>
        {rows.slice(0, TOP_ROWS).map((row) => (
          <ListItem key={row.label} disableGutters data-testid={`${testId}-${row.label}`}>
            <ListItemText primary={row.label} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.count}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

/** Who opened the page and how far they got, for the period the owner picks. */
export function PublicPageStatsPanel({ insights, days, onDaysChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const tiles = publicPageTiles(insights);
  const noVisits = (insights.stats?.total_clicks ?? 0) === 0;

  return (
    <Stack spacing={2} data-testid="public-page-stats">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
          {t('publicPage.stats.title')}
        </Typography>
        <TextField
          select
          size="small"
          label={t('publicPage.stats.range')}
          value={days}
          onChange={(event) => onDaysChange(Number(event.target.value))}
          slotProps={{ htmlInput: { 'data-testid': 'public-page-range' } }}
          sx={{ minWidth: 160 }}
        >
          {PUBLIC_PAGE_RANGES.map((range) => (
            <MenuItem key={range.days} value={range.days}>
              {t(range.labelKey)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
        }}
      >
        {tiles.map((tile) => (
          <StatCard
            key={tile.key}
            label={t(tile.labelKey)}
            value={tile.value}
            valueVariant="h6"
            cardVariant="outlined"
            testId={`public-page-stat-${tile.key}`}
          />
        ))}
      </Box>
      {noVisits ? (
        <Typography variant="body2" color="text.secondary" data-testid="public-page-stats-empty">
          {t('publicPage.stats.empty')}
        </Typography>
      ) : (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <BreakdownList
            title={t('publicPage.stats.topSources')}
            rows={insights.stats?.platforms ?? []}
            testId="public-page-sources"
          />
          <BreakdownList
            title={t('publicPage.stats.topCities')}
            rows={insights.stats?.cities ?? []}
            testId="public-page-cities"
          />
        </Stack>
      )}
    </Stack>
  );
}
