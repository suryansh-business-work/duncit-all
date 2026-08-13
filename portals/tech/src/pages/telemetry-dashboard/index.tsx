import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { StatCard, QueryGuard } from '@duncit/ui';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BugReportIcon from '@mui/icons-material/BugReport';
import HubIcon from '@mui/icons-material/Hub';
import {
  RANGE_OPTIONS,
  TELEMETRY_DASHBOARD,
  type TelemetryDashboardData,
  type TopBug,
} from './queries';
import DistributionCard from './DistributionCard';
import RecentLogsTable from './RecentLogsTable';

function TopBugRow({ bug }: Readonly<{ bug: TopBug }>) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap title={bug.title}>
          {bug.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {bug.source} · {bug.page}
        </Typography>
      </Box>
      <Chip size="small" label={`${bug.occurrence_count}×`} color="error" variant="outlined" />
    </Stack>
  );
}

function TopBugsList({ bugs }: Readonly<{ bugs: readonly TopBug[] }>) {
  if (bugs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No open bugs — nice.
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5} divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
      {bugs.map((bug) => (
        <TopBugRow key={bug.id} bug={bug} />
      ))}
    </Stack>
  );
}

function buildWidgets(d: TelemetryDashboardData, errorCount: number): DashboardWidget[] {
  const kpi = (id: string, x: number, content: DashboardWidget['content']): DashboardWidget => ({
    id,
    bare: true,
    defaultLayout: { x, y: 0, w: 3, h: 2 },
    minW: 2,
    minH: 2,
    content,
  });

  return [
    kpi('total-logs', 0, <StatCard sx={{ height: '100%' }} icon={<ListAltIcon fontSize="small" />} label="TOTAL LOGS" value={String(d.total_logs)} />),
    kpi('errors', 3, <StatCard sx={{ height: '100%' }} icon={<ErrorOutlineIcon fontSize="small" />} label="ERRORS" value={String(errorCount)} />),
    kpi('active-bugs', 6, <StatCard sx={{ height: '100%' }} icon={<BugReportIcon fontSize="small" />} label="ACTIVE BUGS" value={String(d.active_bugs)} />),
    kpi('sources', 9, <StatCard sx={{ height: '100%' }} icon={<HubIcon fontSize="small" />} label="SOURCES" value={String(d.by_source.length)} />),
    {
      id: 'by-level',
      bare: true,
      defaultLayout: { x: 0, y: 2, w: 4, h: 5 },
      minW: 3,
      minH: 3,
      content: <DistributionCard title="By level" buckets={d.by_level} />,
    },
    {
      id: 'by-source',
      bare: true,
      defaultLayout: { x: 4, y: 2, w: 4, h: 5 },
      minW: 3,
      minH: 3,
      content: <DistributionCard title="By source" buckets={d.by_source} />,
    },
    {
      id: 'by-environment',
      bare: true,
      defaultLayout: { x: 8, y: 2, w: 4, h: 5 },
      minW: 3,
      minH: 3,
      content: <DistributionCard title="By environment" buckets={d.by_environment} />,
    },
    {
      id: 'top-bugs',
      title: 'Top open bugs',
      defaultLayout: { x: 0, y: 7, w: 12, h: 5 },
      minW: 4,
      minH: 3,
      content: <TopBugsList bugs={d.top_bugs} />,
    },
    {
      id: 'recent-logs',
      title: 'Recent logs',
      disablePadding: true,
      defaultLayout: { x: 0, y: 12, w: 12, h: 7 },
      minW: 4,
      minH: 4,
      content: <RecentLogsTable />,
    },
  ];
}

export default function TelemetryDashboardPage() {
  const [rangeDays, setRangeDays] = useState(7);
  const { data, loading, error } = useQuery<{ telemetryDashboard: TelemetryDashboardData }>(
    TELEMETRY_DASHBOARD,
    { variables: { range_days: rangeDays }, fetchPolicy: 'cache-and-network' },
  );

  const d = data?.telemetryDashboard;
  const errorCount = d?.by_level.find((b) => b.key === 'error')?.count ?? 0;

  const header = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={1}
    >
      <Box>
        <Typography variant="h5">Telemetry Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Log volume and errors across every surface — mWeb, portals, native iOS/Android and the
          server.
        </Typography>
      </Box>
      <TextField
        select
        size="small"
        label="Range"
        value={rangeDays}
        onChange={(e) => setRangeDays(Number(e.target.value))}
        sx={{ minWidth: 160 }}
      >
        {RANGE_OPTIONS.map((r) => (
          <MenuItem key={r.value} value={r.value}>
            {r.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );

  if (!d) {
    return (
      <Stack spacing={3}>
        {header}
        <QueryGuard loading={loading && !data} error={error} errorText={error?.message} spinnerSx={{ py: 6 }}>
          {() => null}
        </QueryGuard>
      </Stack>
    );
  }

  return (
    <DuncitDashboard
      dashboardId="tech.telemetry"
      header={header}
      widgets={buildWidgets(d, errorCount)}
    />
  );
}
