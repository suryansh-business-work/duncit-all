import { Box, Card, CardContent, Typography } from '@mui/material';
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
        <Card key={kpi.label} variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary" fontWeight={800}>
              {kpi.label}
            </Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color: TONE_COLOR[kpi.tone] }}>
              {kpi.value}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
