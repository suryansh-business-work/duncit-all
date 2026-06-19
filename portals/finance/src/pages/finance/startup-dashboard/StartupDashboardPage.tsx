import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { FOUNDER_DASHBOARD, SAVE_FOUNDER_SETTING } from './queries';
import type { FounderDashboardData, FounderMetric } from './types';
import MetricGrid from './MetricGrid';
import MetricDrawer, { type DrawerMode } from './MetricDrawer';

const yearStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 11, 1);
};

export default function StartupDashboardPage() {
  const [from, setFrom] = useState<Date | null>(yearStart());
  const [to, setTo] = useState<Date | null>(new Date());
  const [active, setActive] = useState<{ metric: FounderMetric; mode: DrawerMode } | null>(null);

  const { data, loading, error, refetch } = useQuery<FounderDashboardData>(FOUNDER_DASHBOARD, {
    variables: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    fetchPolicy: 'cache-and-network',
  });
  const [saveSetting, { loading: saving }] = useMutation(SAVE_FOUNDER_SETTING);

  const dashboard = data?.founderDashboard;
  const settingsMap = useMemo(() => {
    const map: Record<string, number> = {};
    dashboard?.settings.forEach((s) => { map[s.key] = s.value; });
    return map;
  }, [dashboard]);

  const openInfo = (metric: FounderMetric) => setActive({ metric, mode: 'info' });
  const openSettings = (metric: FounderMetric) => setActive({ metric, mode: 'settings' });

  const handleSave = async (entries: { key: string; value: number }[]) => {
    await Promise.all(entries.map((e) => saveSetting({ variables: { input: e } })));
    await refetch();
    setActive(null);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Startup Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Founder KPIs across revenue, growth, customers and operations.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <DatePicker
              label="From"
              value={from}
              onChange={setFrom}
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker label="To" value={to} onChange={setTo} slotProps={{ textField: { size: 'small' } }} />
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}

        {loading && !dashboard ? (
          <Stack alignItems="center" sx={{ py: 8 }}>
            <CircularProgress />
          </Stack>
        ) : (
          dashboard && (
            <>
              <MetricGrid
                title="Founder Overview"
                icon="insights"
                metrics={dashboard.top}
                highlight
                onInfo={openInfo}
                onSettings={openSettings}
              />
              {dashboard.categories.map((cat) => (
                <MetricGrid
                  key={cat.key}
                  title={cat.label}
                  icon={cat.icon}
                  metrics={cat.metrics}
                  onInfo={openInfo}
                  onSettings={openSettings}
                />
              ))}
            </>
          )
        )}

        <MetricDrawer
          metric={active?.metric ?? null}
          mode={active?.mode ?? null}
          settings={settingsMap}
          saving={saving}
          onClose={() => setActive(null)}
          onSave={handleSave}
        />
      </Box>
    </LocalizationProvider>
  );
}
