import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { StatCard, QueryGuard } from '@duncit/ui';
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

export default function TelemetryDashboardPage() {
  const [rangeDays, setRangeDays] = useState(7);
  const { data, loading, error } = useQuery<{ telemetryDashboard: TelemetryDashboardData }>(
    TELEMETRY_DASHBOARD,
    { variables: { range_days: rangeDays }, fetchPolicy: 'cache-and-network' },
  );

  const d = data?.telemetryDashboard;
  const errorCount = d?.by_level.find((b) => b.key === 'error')?.count ?? 0;

  return (
    <Stack spacing={3}>
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

      <QueryGuard loading={loading && !data} error={error} errorText={error?.message} spinnerSx={{ py: 6 }}>
        {d && (
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <StatCard sx={{ flex: 1 }} icon={<ListAltIcon fontSize="small" />} label="TOTAL LOGS" value={String(d.total_logs)} />
              <StatCard sx={{ flex: 1 }} icon={<ErrorOutlineIcon fontSize="small" />} label="ERRORS" value={String(errorCount)} />
              <StatCard sx={{ flex: 1 }} icon={<BugReportIcon fontSize="small" />} label="ACTIVE BUGS" value={String(d.active_bugs)} />
              <StatCard sx={{ flex: 1 }} icon={<HubIcon fontSize="small" />} label="SOURCES" value={String(d.by_source.length)} />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <DistributionCard title="By level" buckets={d.by_level} />
              <DistributionCard title="By source" buckets={d.by_source} />
              <DistributionCard title="By environment" buckets={d.by_environment} />
            </Stack>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Top open bugs
                </Typography>
                {d.top_bugs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No open bugs — nice.
                  </Typography>
                ) : (
                  <Stack spacing={1.5} divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
                    {d.top_bugs.map((bug) => (
                      <TopBugRow key={bug.id} bug={bug} />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Recent logs
              </Typography>
              <RecentLogsTable />
            </Box>
          </Stack>
        )}
      </QueryGuard>
    </Stack>
  );
}
