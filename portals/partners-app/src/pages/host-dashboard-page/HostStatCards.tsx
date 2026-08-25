import { Grid } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import type { HostEarningsSummary, HostStatusCounts } from './queries';
import { useTranslation } from '@duncit/shell';

const countFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

interface CardDef {
  key: string;
  label: string;
  hint: string;
  value: string;
}

interface Props {
  earnings: HostEarningsSummary;
  counts: HostStatusCounts;
  loading: boolean;
}

/**
 * The dashboard's headline numbers.
 *
 * The money tiles come from the host earnings summary and the pod tiles from
 * hostInsights, which is the same pair the native screen reads — a host who
 * checks both surfaces must not find two different answers.
 */
export default function HostStatCards({ earnings, counts, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (value: number) => formatMoney(value, { symbol: earnings.currency_symbol });
  const count = (value: number) => countFmt.format(Number(value || 0));
  const totalPods = counts.upcoming + counts.ongoing + counts.completed + counts.cancelled;

  const cards: CardDef[] = [
    {
      key: 'lifetime',
      label: t('partners.hostDashboardPage.lifetimeEarnings'),
      hint: 'Everything your pods have paid out',
      value: money(earnings.lifetime_earnings),
    },
    {
      key: 'this_month',
      label: t('partners.hostDashboardPage.thisMonth'),
      hint: 'Payouts credited this calendar month',
      value: money(earnings.this_month_earnings),
    },
    {
      key: 'pending',
      label: t('partners.hostDashboardPage.pending'),
      hint: 'Approved payouts not yet settled',
      value: money(earnings.pending_amount),
    },
    { key: 'total', label: t('partners.common.totalPods'), hint: 'Every pod you have hosted', value: count(totalPods) },
    {
      key: 'upcoming',
      label: t('partners.common.upcoming'),
      hint: 'Scheduled from today onwards',
      value: count(counts.upcoming),
    },
    {
      key: 'completed',
      label: t('partners.common.completed'),
      hint: 'Pods you have already settled',
      value: count(counts.completed),
    },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid
          key={card.key}
          size={{
            xs: 12,
            sm: 6,
            md: 4,
            lg: 2
          }}>
          <StatCard
            label={card.label}
            labelWeight={800}
            labelSx={{ lineHeight: 1.4 }}
            value={card.value}
            valueWeight={950}
            hint={card.hint}
            loading={loading}
            skeletonProps={{ width: 90, height: 36 }}
            headerSx={{ mb: 0.75 }}
            sx={{ height: '100%', borderRadius: 2 }}
          />
        </Grid>
      ))}
    </Grid>
  );
}
