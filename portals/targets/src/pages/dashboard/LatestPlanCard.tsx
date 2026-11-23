import { Link as RouterLink } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat } from '@duncit/app-settings';
import { EmptyState, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { DashboardPlan } from '../../lib/dashboard-queries';
import { formatRupeesShort, formatTarget } from '../../lib/growth-format';

type Figure = { id: string; label: string; value: string };

/** The newest saved Growth Calculator run: the targets the team is planning against. */
export default function LatestPlanCard({ plan }: Readonly<{ plan: DashboardPlan | null }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const open = (
    <DuncitButton component={RouterLink} to="/growth-calculator" size="small" data-testid="targets-plan-open">
      {t('targets.dashboard.plan.open')}
    </DuncitButton>
  );

  if (!plan) {
    return (
      <SectionCard title={t('targets.dashboard.plan.title')} icon={<InsightsIcon />}>
        <EmptyState
          compact
          title={t('targets.dashboard.plan.empty')}
          body={t('targets.dashboard.plan.emptyBody')}
          action={open}
          data-testid="targets-plan-empty"
        />
      </SectionCard>
    );
  }

  const { totals } = plan;
  const figures: Figure[] = [
    { id: 'monthly-pods', label: t('targets.growth.kpi.monthlyPods'), value: formatTarget(totals.monthly_pods) },
    { id: 'total-leads', label: t('targets.growth.kpi.totalLeads'), value: formatTarget(totals.total_leads) },
    {
      id: 'partners',
      label: t('targets.growth.kpi.partners'),
      value: t('targets.growth.kpi.partnersValue', {
        vars: { venues: formatTarget(totals.venues), hosts: formatTarget(totals.hosts) },
      }),
    },
    { id: 'monthly-gmv', label: t('targets.growth.kpi.monthlyGmv'), value: formatRupeesShort(totals.monthly_gmv) },
    { id: 'monthly-earnings', label: t('targets.growth.kpi.monthlyEarnings'), value: formatRupeesShort(totals.monthly_earnings) },
    { id: 'annual-earnings', label: t('targets.growth.kpi.annualEarnings'), value: formatRupeesShort(totals.annual_earnings) },
  ];

  return (
    <SectionCard title={t('targets.dashboard.plan.title')} icon={<InsightsIcon />} action={open}>
      <Stack spacing={2} data-testid="targets-plan">
        <Box>
          <Typography variant="subtitle2" component="p" sx={{ fontWeight: 700 }}>
            {plan.title}
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
            {t('targets.dashboard.plan.savedBy', {
              vars: { name: plan.calculated_by.name, date: formatDateTime(plan.created_at) },
            })}
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
            {t('targets.growth.kpi.allCities', { vars: { count: formatTarget(totals.cities) } })}
          </Typography>
        </Box>
        <Box component="dl" sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, m: 0 }}>
          {figures.map((figure) => (
            <Box key={figure.id} data-testid={`targets-plan-${figure.id}`}>
              <Typography variant="caption" component="dt" sx={{ color: 'text.secondary' }}>
                {figure.label}
              </Typography>
              <Typography variant="subtitle1" component="dd" sx={{ fontWeight: 700, m: 0 }}>
                {figure.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Stack>
    </SectionCard>
  );
}
