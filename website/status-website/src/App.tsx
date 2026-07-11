import { useMemo, useState } from 'react';
import { Alert, Container, CssBaseline, Skeleton, Stack, ThemeProvider } from '@mui/material';
import Header from './components/Header';
import OverallStatusBanner from './components/OverallStatusBanner';
import ServiceGroupCard from './components/ServiceGroupCard';
import Footer from './components/Footer';
import { ServiceDetailsDialog } from './components/service-details-dialog';
import { useBranding } from './hooks/useBranding';
import { useColorMode } from './hooks/useColorMode';
import { useStatusData } from './hooks/useStatusData';
import { buildTheme } from './theme';
import type { StatusService } from './types';

const SKELETON_GROUPS = ['consoles', 'platform', 'websites'];

function GroupsSkeleton() {
  return (
    <Stack spacing={3} mb={4}>
      {SKELETON_GROUPS.map((key) => (
        <Skeleton key={key} variant="rounded" height={140} />
      ))}
    </Stack>
  );
}

export default function App() {
  const { mode, toggleMode } = useColorMode();
  const branding = useBranding();
  const data = useStatusData();
  const [selected, setSelected] = useState<StatusService | null>(null);

  const theme = useMemo(() => buildTheme(mode, branding.primaryColor), [mode, branding.primaryColor]);

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
        <OverallStatusBanner
          groups={data.groups}
          summary={data.summary}
          lastUpdated={data.lastUpdated}
        />
        {data.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {data.error}
          </Alert>
        )}
        {data.loading && <GroupsSkeleton />}
        {data.groups?.map((group) => (
          <ServiceGroupCard
            key={group.title}
            group={group}
            summary={data.summary}
            onSelect={setSelected}
          />
        ))}
        <Footer appName={branding.appName} />
      </Container>
      <ServiceDetailsDialog service={selected} onClose={() => setSelected(null)} />
    </ThemeProvider>
  );
}
