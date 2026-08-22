import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { FOUNDER_DASHBOARD, SAVE_FOUNDER_SETTING } from './queries';
import type { FounderDashboardData, FounderMetric } from './types';
import MetricGrid from './MetricGrid';
import MetricDrawer, { type DrawerMode } from './MetricDrawer';
import { useTranslation } from '@duncit/app-settings';

const yearStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 11, 1);
};

/** A metric section is roughly this many rows tall — enough for a 4-up grid. */
const SECTION_HEIGHT = 5;

export default function StartupDashboardPage() {
  const { t } = useTranslation();
  const [from, setFrom] = useState<Date | null>(yearStart());
  const [to, setTo] = useState<Date | null>(new Date());
  const [active, setActive] = useState<{ metric: FounderMetric; mode: DrawerMode } | null>(null);

  const isoRange = { from: from ? from.toISOString() : null, to: to ? to.toISOString() : null };
  const { data, loading, error, refetch } = useQuery<FounderDashboardData>(FOUNDER_DASHBOARD, {
    variables: isoRange,
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

  // Each metric category is a widget keyed on its own `key`, so a founder can
  // put Revenue above Growth and keep it that way — and a category the server
  // adds later lands at the bottom rather than displacing one they moved.
  const widgets: DashboardWidget[] = dashboard
    ? [
        {
          id: 'founder-overview',
          bare: true,
          // Metric count per section is server-driven — no fixed h is right.
          fitContent: true,
          defaultLayout: { x: 0, y: 0, w: 12, h: SECTION_HEIGHT },
          minW: 4,
          // minH floors the measured height — keep it low or a sparse section pins a void.
          minH: 2,
          content: (
            <MetricGrid
              title={t('finance.startupDashboard.founderOverview')}
              icon="insights"
              metrics={dashboard.top}
              highlight
              onInfo={openInfo}
              onSettings={openSettings}
            />
          ),
        },
        ...dashboard.categories.map((cat, index) => ({
          id: `category-${cat.key}`,
          bare: true,
          fitContent: true,
          defaultLayout: {
            x: 0,
            y: SECTION_HEIGHT * (index + 1),
            w: 12,
            h: SECTION_HEIGHT,
          },
          minW: 4,
          minH: 2,
          content: (
            <MetricGrid
              title={cat.label}
              icon={cat.icon}
              metrics={cat.metrics}
              onInfo={openInfo}
              onSettings={openSettings}
            />
          ),
        })),
      ]
    : [];

  const header = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={2}
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
          label={t('finance.startupDashboard.from')}
          value={from}
          onChange={setFrom}
          slotProps={{ textField: { size: 'small' } }}
        />
        <DatePicker label="To" value={to} onChange={setTo} slotProps={{ textField: { size: 'small' } }} />
      </Stack>
    </Stack>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}

      {loading && !dashboard ? (
        <Stack spacing={3}>
          {header}
          <Stack alignItems="center" sx={{ py: 8 }}>
            <CircularProgress />
          </Stack>
        </Stack>
      ) : (
        <DuncitDashboard dashboardId="finance.startup" header={header} widgets={widgets} />
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
  );
}
