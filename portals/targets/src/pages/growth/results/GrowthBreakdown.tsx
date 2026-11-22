import { Box, Divider, Stack } from '@mui/material';
import { InfoRow, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { GrowthOutputs } from '../../../lib/growth-calculator';
import { formatRupees, formatTarget } from '../../../lib/growth-format';

type Row = { id: string; label: string; value: string; bold?: boolean };

function Rows({ rows, testId }: Readonly<{ rows: Row[]; testId: string }>) {
  return (
    <Stack spacing={0.75} divider={<Divider flexItem />} data-testid={testId}>
      {rows.map((row) => (
        <InfoRow key={row.id} variant="split" label={row.label} value={row.value} bold={row.bold} testId={`${testId}-${row.id}`} />
      ))}
    </Stack>
  );
}

/**
 * Every output as label and value, per pod, per city and across all cities —
 * the exact figures behind the tiles and charts, readable without a chart.
 */
export default function GrowthBreakdown({ outputs }: Readonly<{ outputs: GrowthOutputs }>) {
  const { t } = useTranslation();
  const { per_pod: pod, per_city: city, totals } = outputs;

  const perPod: Row[] = [
    { id: 'pod-value', label: t('targets.growth.breakdown.podValue'), value: formatRupees(pod.pod_value) },
    { id: 'earnings', label: t('targets.growth.breakdown.earningsPerPod'), value: formatRupees(pod.earnings_per_pod), bold: true },
  ];
  const perCity: Row[] = [
    { id: 'venues', label: t('targets.growth.breakdown.venues'), value: formatTarget(city.venues) },
    { id: 'hosts', label: t('targets.growth.breakdown.hosts'), value: formatTarget(city.hosts) },
    { id: 'pods', label: t('targets.growth.breakdown.monthlyPods'), value: formatTarget(city.monthly_pods) },
    { id: 'gmv', label: t('targets.growth.breakdown.monthlyGmv'), value: formatRupees(city.monthly_gmv) },
    { id: 'earnings', label: t('targets.growth.breakdown.monthlyEarnings'), value: formatRupees(city.monthly_earnings), bold: true },
    { id: 'host-leads', label: t('targets.growth.breakdown.hostLeads'), value: formatTarget(city.host_leads) },
    { id: 'venue-leads', label: t('targets.growth.breakdown.venueLeads'), value: formatTarget(city.venue_leads) },
  ];
  const allCities: Row[] = [
    { id: 'cities', label: t('targets.growth.breakdown.cities'), value: formatTarget(totals.cities) },
    { id: 'venues', label: t('targets.growth.breakdown.venues'), value: formatTarget(totals.venues) },
    { id: 'hosts', label: t('targets.growth.breakdown.hosts'), value: formatTarget(totals.hosts) },
    { id: 'pods', label: t('targets.growth.breakdown.monthlyPods'), value: formatTarget(totals.monthly_pods) },
    { id: 'host-leads', label: t('targets.growth.breakdown.hostLeads'), value: formatTarget(totals.host_leads) },
    { id: 'venue-leads', label: t('targets.growth.breakdown.venueLeads'), value: formatTarget(totals.venue_leads) },
    { id: 'leads', label: t('targets.growth.breakdown.totalLeads'), value: formatTarget(totals.total_leads) },
    { id: 'gmv', label: t('targets.growth.breakdown.monthlyGmv'), value: formatRupees(totals.monthly_gmv) },
    { id: 'earnings', label: t('targets.growth.breakdown.monthlyEarnings'), value: formatRupees(totals.monthly_earnings), bold: true },
    { id: 'annual-gmv', label: t('targets.growth.breakdown.annualGmv'), value: formatRupees(totals.annual_gmv) },
    { id: 'annual-earnings', label: t('targets.growth.breakdown.annualEarnings'), value: formatRupees(totals.annual_earnings), bold: true },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, alignItems: 'start' }}>
      <SectionCard title={t('targets.growth.breakdown.perPod')}>
        <Rows rows={perPod} testId="growth-breakdown-pod" />
      </SectionCard>
      <SectionCard title={t('targets.growth.breakdown.perCity')}>
        <Rows rows={perCity} testId="growth-breakdown-city" />
      </SectionCard>
      <SectionCard title={t('targets.growth.breakdown.allCities')}>
        <Rows rows={allCities} testId="growth-breakdown-total" />
      </SectionCard>
    </Box>
  );
}
