import { Box } from '@mui/material';
import { StatCard } from '@duncit/ui';
import type { DashboardKpi } from './onboardingStats';

const TONE_COLOR: Record<DashboardKpi['tone'], string> = {
  default: 'text.primary',
  success: 'success.main',
  warning: 'warning.main',
};

// Compact KPI strip across the top of the onboarding dashboard. A CSS grid (not
// MUI Grid) keeps every card flush-left with the page headings — no negative
// margins — and gives uniform columns. Pure + presentational; the numbers
// (built in onboardingStats) stay unit-tested.
export default function DashboardKpis({ kpis }: Readonly<{ kpis: DashboardKpi[] }>) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
      }}
    >
      {kpis.map((kpi) => (
        <StatCard
          key={kpi.label}
          label={kpi.label}
          labelWeight={800}
          value={kpi.value}
          valueVariant="h4"
          valueWeight={900}
          valueColor={TONE_COLOR[kpi.tone]}
          sx={{ height: '100%' }}
        />
      ))}
    </Box>
  );
}
