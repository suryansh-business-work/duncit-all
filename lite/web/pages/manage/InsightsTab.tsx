import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { QueryGuard, StatCard } from '@duncit/ui';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { EmptyState } from '../../components/EmptyState';
import { LITE_EVENT_INSIGHTS, type LiteInsightDay } from '../../graphql/events';
import { visuallyHidden } from '../../lib/a11y';
import { InsightsSkeleton } from './ManageSkeleton';

type Window = '7' | '30' | '90';
const WINDOWS: readonly Window[] = ['7', '30', '90'];

/** Page views per day as bars; the same numbers sit in a table for screen readers. */
function ViewsChart({ series, caption }: Readonly<{ series: readonly LiteInsightDay[]; caption: string }>) {
  const { t } = useWebT();
  const peak = Math.max(1, ...series.map((d) => d.views));
  return (
    <>
      <Box aria-hidden sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 140, px: 1 }}>
        {series.map((day) => (
          <Box key={day.day} title={`${day.day}: ${day.views}`} sx={{ flex: 1, minWidth: 2, height: `${(day.views / peak) * 100}%`, minHeight: day.views > 0 ? 4 : 1, bgcolor: day.views > 0 ? 'secondary.main' : 'divider', borderRadius: `${LITE_RADII.control / 2}px` }} />
        ))}
      </Box>
      <Table size="small" sx={visuallyHidden}>
        <caption>{caption}</caption>
        <TableHead>
          <TableRow>
            <TableCell>{t('liteWeb.manage.insights.day')}</TableCell>
            <TableCell>{t('liteWeb.manage.insights.views')}</TableCell>
            <TableCell>{t('liteWeb.manage.insights.registrations')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {series.map((day) => (
            <TableRow key={day.day}>
              <TableCell>{day.day}</TableCell>
              <TableCell>{day.views}</TableCell>
              <TableCell>{day.registrations}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

/** Page views and registrations over the last 7, 30 or 90 days (the window kept in the URL). */
export function InsightsTab({ event }: Readonly<{ event: LiteEvent }>) {
  const { t } = useWebT();
  const items = useMemo<DuncitTabItem<Window>[]>(() => WINDOWS.map((value) => ({ value, label: t('liteWeb.manage.insights.window', { vars: { days: value } }) })), [t]);
  const range = useTabParam<Window>({ items, fallback: '7', param: 'days' });
  const { data, loading, error } = useQuery(LITE_EVENT_INSIGHTS, { variables: { event_id: event.id, days: Number(range.value) }, fetchPolicy: 'cache-and-network' });
  const insights = data?.liteEventInsights;
  return (
    <Stack spacing={3} data-testid="manage-insights">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h3" component="h2">
          {t('liteWeb.manage.insights.title')}
        </Typography>
        <ToggleButtonGroup exclusive size="small" value={range.value} onChange={(_e, next: Window | null) => next && range.onChange(next)} aria-label={t('liteWeb.manage.insights.range')}>
          {items.map((item) => (
            <ToggleButton key={item.value} value={item.value} data-testid={`insights-${item.value}`}>
              {item.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      <QueryGuard loading={loading && !insights} error={error} skeleton={<InsightsSkeleton />}>
        {() =>
          insights ? (
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <StatCard label={t('liteWeb.manage.insights.views')} value={insights.total_views} testId="insights-views" />
                <StatCard label={t('liteWeb.manage.insights.registrations')} value={insights.total_registrations} testId="insights-registrations" />
              </Box>
              {insights.total_views + insights.total_registrations === 0 ? (
                <EmptyState icon={<InsightsOutlinedIcon />} title={t('liteWeb.manage.insights.empty')} body={t('liteWeb.manage.insights.emptyBody')} testId="insights-empty" />
              ) : (
                <ViewsChart series={insights.series} caption={t('liteWeb.manage.insights.caption', { vars: { days: insights.days } })} />
              )}
            </Stack>
          ) : null
        }
      </QueryGuard>
    </Stack>
  );
}
