import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Chip, Skeleton, Stack } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import { useIsMcpManager } from '../../lib/roles';
import Breakdowns from './Breakdowns';
import CallsPerDayChart from './CallsPerDayChart';
import KpiTiles from './KpiTiles';
import PersonFilter, { type PersonPick } from './PersonFilter';
import RangeFilter from './RangeFilter';
import { MCP_USAGE_DASHBOARD, type UsageDashboardData, type UsageDashboardVars } from './queries';
import { fillDays } from './usageDays';
import { useDashboardRange } from './useDashboardRange';

/**
 * The console's home: how much AI apps used Duncit in a window, how it went
 * and what it cost. Managers see everyone (or one person); everybody else sees
 * their own calls — the server decides, and the scope chip says which.
 */
export default function DashboardPage() {
  const { t } = useTranslation();
  const { dayKey } = useDateFormat();
  const manager = useIsMcpManager();
  const { range, setRange, problem, period } = useDashboardRange();
  const [person, setPerson] = useState<PersonPick | null>(null);
  const { data, loading, error, refetch } = useQuery<UsageDashboardData, UsageDashboardVars>(MCP_USAGE_DASHBOARD, {
    variables: { ...period, user_id: person?.userId ?? null },
    skip: problem !== null,
    fetchPolicy: 'cache-and-network',
  });
  const summary = data?.mcpUsageSummary;
  const currency = data?.latestCall.rows[0]?.currency ?? '';
  const days = useMemo(() => fillDays(summary?.by_day ?? [], period, dayKey), [summary, period, dayKey]);
  const scope = summary?.scope === 'ALL' ? t('mcp.dashboard.scopeAll') : t('mcp.dashboard.scopeMine');
  const waiting = loading && !summary;
  const hasCalls = Boolean(summary && summary.totals.calls > 0);

  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('mcp.dashboard.title')}
        subtitle={t('mcp.dashboard.subtitle')}
        actions={summary ? <Chip label={scope} variant="outlined" data-testid="mcp-scope" /> : null}
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'flex-start' } }}>
        <RangeFilter range={range} problem={problem} onChange={setRange} />
        {manager ? (
          <PersonFilter emails={(summary?.by_user ?? []).map((bucket) => bucket.key)} value={person} onChange={setPerson} />
        ) : null}
      </Stack>
      {error && !summary ? (
        <Alert
          severity="error"
          action={
            <DuncitButton color="inherit" size="small" onClick={() => refetch()}>
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {t('mcp.common.loadFailed')}
        </Alert>
      ) : null}
      <KpiTiles totals={summary?.totals} currency={currency} loading={waiting} />
      {waiting ? <Skeleton variant="rounded" height={300} /> : null}
      {summary && !hasCalls ? (
        <Alert severity="info" data-testid="mcp-dashboard-empty">
          {t('mcp.dashboard.empty')}
        </Alert>
      ) : null}
      {summary && hasCalls ? (
        <>
          <CallsPerDayChart days={days} />
          <Breakdowns summary={summary} currency={currency} />
        </>
      ) : null}
    </Stack>
  );
}
