import { Stack } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { AppIcon } from '@duncit/shell';
import { useTranslation } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import type { ExpenseDashboardData } from './queries';

interface Props {
  data?: ExpenseDashboardData;
  currency: string;
  loading: boolean;
}

const CARD_SX = { borderRadius: 3, flex: '1 1 210px', minWidth: 210 } as const;

/**
 * The three compensation states that are a QUEUE, written as a list because
 * the only thing that differs between their tiles is which pair of numbers
 * they read.
 */
const STATE_TILES = [
  { key: 'pending', labelKey: 'finance.expenseDashboard.pendingCompensation', icon: 'timeline', color: 'warning' },
  { key: 'partial', labelKey: 'finance.expenseDashboard.partiallyCompensated', icon: 'insights', color: 'info' },
  { key: 'full', labelKey: 'finance.expenseDashboard.fullyCompensated', icon: 'payments', color: 'success' },
  { key: 'rejected', labelKey: 'finance.expenseDashboard.rejectedExpenses', icon: 'flag', color: 'error' },
] as const;

/** Every number the Expense Dashboard leads with. */
export default function ExpenseDashboardKpis({ data, currency, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (value: number) =>
    formatMoney(value, { symbol: currency, decimals: 2, grouping: false });
  const busy = loading && !data;

  return (
    <Stack spacing={2}>
      <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: 'wrap' }}>
        <StatCard
          label={t('finance.expenseDashboard.totalExpenses')}
          value={money(data?.total_expenses ?? 0)}
          icon={<AppIcon name="expenses" fontSize="small" color="primary" />}
          loading={busy}
          hint={t('finance.expenseDashboard.expenseCount', {
            vars: { count: data?.expense_count ?? 0 },
          })}
          sx={CARD_SX}
        />
        <StatCard
          label={t('finance.expenseDashboard.totalCompensation')}
          value={money(data?.total_compensation_amount ?? 0)}
          icon={<AppIcon name="wallet" fontSize="small" color="success" />}
          loading={busy}
          sx={CARD_SX}
        />
        <StatCard
          label={t('finance.expenseDashboard.stillOwed')}
          value={money(data?.pending_compensation_amount ?? 0)}
          icon={<AppIcon name="quote" fontSize="small" color="warning" />}
          loading={busy}
          hint={t('finance.expenseDashboard.stillOwedHint')}
          sx={CARD_SX}
        />
        <StatCard
          label={t('finance.expenseDashboard.currentMonth')}
          value={money(data?.current_month_total ?? 0)}
          icon={<AppIcon name="calendar" fontSize="small" color="info" />}
          loading={busy}
          hint={t('finance.expenseDashboard.previousMonth', {
            vars: { amount: money(data?.previous_month_total ?? 0) },
          })}
          sx={CARD_SX}
        />
      </Stack>

      <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: 'wrap' }}>
        {STATE_TILES.map((tile) => (
          <StatCard
            key={tile.key}
            label={t(tile.labelKey)}
            value={money(data?.[`${tile.key}_total`] ?? 0)}
            icon={<AppIcon name={tile.icon} fontSize="small" color={tile.color} />}
            loading={busy}
            hint={t('finance.expenseDashboard.expenseCount', {
              vars: { count: data?.[`${tile.key}_count`] ?? 0 },
            })}
            sx={CARD_SX}
          />
        ))}
      </Stack>
    </Stack>
  );
}
