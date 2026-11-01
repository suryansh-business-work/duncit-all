import type { ReactNode } from 'react';
import { Alert, Box, Skeleton, Stack } from '@mui/material';
import { EmptyState, HelpTip, PageHeader, PageIntro, SectionCard, StatCard } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { parseISO } from 'date-fns';
import { parseApiError } from '@duncit/utils';
import AnalyticsFilterBar from './AnalyticsFilterBar';
import type { AnalyticsWindowState } from './useAnalyticsWindow';

export interface Kpi {
  key: string;
  label: string;
  value: string;
  /** What the number counts — a bare number on an analytics page invites the wrong reading. */
  hint: string;
}

/** The headline numbers, as stat tiles. */
export function KpiGrid({ tiles }: Readonly<{ tiles: readonly Kpi[] }>) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' } }} data-testid="analytics-kpis">
      {tiles.map((tile) => (
        <StatCard key={tile.key} testId={`kpi-${tile.key}`} label={tile.label} value={tile.value} hint={tile.hint} />
      ))}
    </Box>
  );
}

/** A titled chart or table with a help tip saying how its metric is worked out. */
export function MetricCard({ title, help, children }: Readonly<{ title: string; help: string; children: ReactNode }>) {
  return (
    <SectionCard title={title} action={<HelpTip title={help} />}>
      {children}
    </SectionCard>
  );
}

/** Cards side by side on a wide screen, stacked on a phone. */
export function CardGrid({ children }: Readonly<{ children: ReactNode }>) {
  return <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>{children}</Box>;
}

interface Props {
  id: string;
  title: string;
  summary: string;
  steps: readonly string[];
  range: AnalyticsWindowState;
  showPlatforms?: boolean;
  error: unknown;
  /** True once the read answered; false shows the loading state. */
  ready: boolean;
  /** True when the window holds nothing at all — the page shows one empty state, not a grid of zeros. */
  empty: boolean;
  /** Extra filters beside the window, e.g. the pipeline. */
  extra?: ReactNode;
  children: ReactNode;
}

/** The frame every analytics page shares: header, intro, the window filter, then loading, error, empty or the figures. */
export default function AnalyticsLayout({ id, title, summary, steps, range, showPlatforms, error, ready, empty, extra, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  let body: ReactNode = children;
  if (error) body = <Alert severity="error">{parseApiError(error, t('marketing.analytics.loadError'))}</Alert>;
  else if (!ready) body = <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} data-testid="analytics-loading" />;
  else if (empty) body = <EmptyState title={t('marketing.analytics.emptyTitle')} body={t('marketing.analytics.emptyBody')} data-testid="analytics-empty" />;

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid={`${id}-page`}>
      <PageHeader title={title} subtitle={t('marketing.analytics.subtitle', { vars: { from: formatDate(parseISO(range.input.from)), to: formatDate(parseISO(range.input.to)) } })} />
      <PageIntro id={`marketing.analytics.${id}`} summary={summary} steps={[...steps]} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
        <AnalyticsFilterBar range={range} showPlatforms={showPlatforms} />
        {extra}
      </Stack>
      {body}
    </Stack>
  );
}
