import { useMemo, useState } from 'react';
import { Alert, Container, CssBaseline, Skeleton, Stack, ThemeProvider, Typography } from '@mui/material';
import Header from './components/Header';
import OverallStatusBanner from './components/OverallStatusBanner';
import GlobalUptimeChart from './components/GlobalUptimeChart';
import StatusFilters, { type FilterState } from './components/StatusFilters';
import ServiceGroupCard from './components/ServiceGroupCard';
import IncidentsSection from './components/IncidentsSection';
import Footer from './components/Footer';
import { ServiceDetailsDialog } from './components/service-details-dialog';
import { useBranding } from './hooks/useBranding';
import { useColorMode } from './hooks/useColorMode';
import { useStatusData } from './hooks/useStatusData';
import { useFilteredGroups } from './hooks/useFilteredGroups';
import { buildTheme } from './theme';
import type { StatusService } from './types';

const SKELETON_GROUPS = ['consoles', 'platform', 'websites'];
const INITIAL_FILTERS: FilterState = { query: '', status: 'all', group: 'all' };

function GroupsSkeleton() {
  return (
    <Stack spacing={3} mb={4}>
      {SKELETON_GROUPS.map((key) => (
        <Skeleton key={key} variant="rounded" height={160} />
      ))}
    </Stack>
  );
}

export default function App() {
  const { mode, toggleMode } = useColorMode();
  const branding = useBranding();
  const data = useStatusData();
  const [selected, setSelected] = useState<StatusService | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const theme = useMemo(() => buildTheme(mode, branding.primaryColor), [mode, branding.primaryColor]);
  const groupTitles = useMemo(() => data.groups?.map((group) => group.title) ?? [], [data.groups]);
  const filteredGroups = useFilteredGroups(data.groups, data.summary, filters);
  const noMatches = data.groups !== null && filteredGroups.length === 0;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ pt: { xs: 4, sm: 7 }, pb: 8 }}>
        <Header
          appName={branding.appName}
          logoUrl={branding.logoUrl}
          environment={data.environment}
          mode={mode}
          onToggleMode={toggleMode}
        />
        <OverallStatusBanner overall={data.summary?.overall} lastUpdated={data.lastUpdated} />
        <GlobalUptimeChart
          global={data.summary?.global}
          overallUptime={data.summary?.overall.uptime_90d}
        />
        {data.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {data.error}
          </Alert>
        )}
        {data.loading && <GroupsSkeleton />}
        {data.groups && (
          <StatusFilters value={filters} groupTitles={groupTitles} onChange={setFilters} />
        )}
        {noMatches && (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No services match your filters.
          </Typography>
        )}
        {filteredGroups.map((group) => (
          <ServiceGroupCard
            key={group.title}
            group={group}
            summary={data.summary}
            onSelect={setSelected}
          />
        ))}
        <IncidentsSection incidents={data.incidents} />
        <Footer appName={branding.appName} />
      </Container>
      <ServiceDetailsDialog service={selected} onClose={() => setSelected(null)} />
    </ThemeProvider>
  );
}
