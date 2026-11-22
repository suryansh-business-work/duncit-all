import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import SavingsIcon from '@mui/icons-material/Savings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EventIcon from '@mui/icons-material/Event';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { GrowthOutputs } from '../../../lib/growth-calculator';
import { formatRupees, formatRupeesShort, formatTarget } from '../../../lib/growth-format';

interface Kpi {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}

/**
 * The headline targets, one tile each. Money tiles lead with the exact figure
 * and carry the lakh / crore shorthand beneath it, so a planner can read
 * ₹1,60,00,000 and ₹1.6Cr at a glance.
 */
export default function GrowthKpis({ outputs }: Readonly<{ outputs: GrowthOutputs }>) {
  const { t } = useTranslation();
  const { per_pod: pod, totals } = outputs;
  const across = t('targets.growth.kpi.allCities', { vars: { count: formatTarget(totals.cities) } });

  const kpis: Kpi[] = [
    {
      id: 'pod-value',
      label: t('targets.growth.kpi.podValue'),
      value: formatRupees(pod.pod_value),
      hint: `${t('targets.growth.kpi.earningsPerPod')}: ${formatRupees(pod.earnings_per_pod)}`,
      icon: <CurrencyRupeeIcon />,
    },
    {
      id: 'monthly-gmv',
      label: t('targets.growth.kpi.monthlyGmv'),
      value: formatRupees(totals.monthly_gmv),
      hint: `${formatRupeesShort(totals.monthly_gmv)} · ${across}`,
      icon: <TrendingUpIcon />,
    },
    {
      id: 'monthly-earnings',
      label: t('targets.growth.kpi.monthlyEarnings'),
      value: formatRupees(totals.monthly_earnings),
      hint: `${formatRupeesShort(totals.monthly_earnings)} · ${t('targets.growth.kpi.beforeExpenses')}`,
      icon: <SavingsIcon />,
    },
    {
      id: 'annual-earnings',
      label: t('targets.growth.kpi.annualEarnings'),
      value: formatRupees(totals.annual_earnings),
      hint: `${formatRupeesShort(totals.annual_earnings)} · ${t('targets.growth.kpi.beforeExpenses')}`,
      icon: <CalendarMonthIcon />,
    },
    {
      id: 'monthly-pods',
      label: t('targets.growth.kpi.monthlyPods'),
      value: formatTarget(totals.monthly_pods),
      hint: across,
      icon: <EventIcon />,
    },
    {
      id: 'partners',
      label: t('targets.growth.kpi.partners'),
      value: t('targets.growth.kpi.partnersValue', {
        vars: { venues: formatTarget(totals.venues), hosts: formatTarget(totals.hosts) },
      }),
      hint: across,
      icon: <StorefrontIcon />,
    },
    {
      id: 'total-leads',
      label: t('targets.growth.kpi.totalLeads'),
      value: formatTarget(totals.total_leads),
      hint: t('targets.growth.kpi.leadsSplit', {
        vars: { host: formatTarget(totals.host_leads), venue: formatTarget(totals.venue_leads) },
      }),
      icon: <GroupAddIcon />,
    },
  ];

  return (
    <Box
      sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' } }}
      aria-live="polite"
    >
      {kpis.map((kpi) => (
        <Box key={kpi.id} data-testid={`growth-kpi-${kpi.id}`}>
          <StatCard label={kpi.label} value={kpi.value} hint={kpi.hint} icon={kpi.icon} valueVariant="h6" />
        </Box>
      ))}
    </Box>
  );
}
