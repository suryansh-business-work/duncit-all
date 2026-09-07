import { Stack } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { AppIcon } from '@duncit/shell';
import { useTranslation } from '@duncit/app-settings';
import { formatMoney, type EmployeeExpenseTotals } from '@duncit/utils';

interface Props {
  summary?: EmployeeExpenseTotals;
  currency: string;
  loading: boolean;
}

const CARD_SX = { borderRadius: 3, flex: '1 1 220px', minWidth: 220 } as const;

/**
 * The tiles above the queue, in the order a reviewer reads them: what is still
 * theirs to answer first, then what has been answered, then the all-time total.
 *
 * Written as a list rather than four blocks because the only thing that differs
 * between them is which pair of numbers they read.
 */
const TILES = [
  { key: 'pending', labelKey: 'employeeExpense.review.pendingValue', icon: 'timeline', color: 'warning' },
  { key: 'approved', labelKey: 'employeeExpense.review.approvedValue', icon: 'payments', color: 'success' },
  { key: 'rejected', labelKey: 'employeeExpense.review.rejectedValue', icon: 'flag', color: 'error' },
] as const;

export default function EmployeeExpenseKpis({ summary, currency, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (value: number) =>
    formatMoney(value, { symbol: currency, decimals: 2, grouping: false });
  const busy = loading && !summary;

  return (
    <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: 'wrap' }}>
      {TILES.map((tile) => (
        <StatCard
          key={tile.key}
          label={t(tile.labelKey)}
          value={money(summary?.[`${tile.key}_total`] ?? 0)}
          icon={<AppIcon name={tile.icon} fontSize="small" color={tile.color} />}
          loading={busy}
          hint={t('employeeExpense.review.claimsCount', {
            vars: { count: summary?.[`${tile.key}_count`] ?? 0 },
          })}
          sx={CARD_SX}
        />
      ))}
      <StatCard
        label={t('employeeExpense.review.claimedValue')}
        value={money(summary?.claimed_total ?? 0)}
        icon={<AppIcon name="expenses" fontSize="small" color="primary" />}
        loading={busy}
        hint={t('employeeExpense.review.employeesCount', {
          vars: { count: summary?.employee_count ?? 0 },
        })}
        sx={CARD_SX}
      />
    </Stack>
  );
}
