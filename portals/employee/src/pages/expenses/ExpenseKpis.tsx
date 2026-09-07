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

/** The four tiles above an employee's own claim list. */
export default function ExpenseKpis({ summary, currency, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (value: number) =>
    formatMoney(value, { symbol: currency, decimals: 2, grouping: false });
  const pending = summary?.pending_count ?? 0;
  const busy = loading && !summary;

  return (
    <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: 'wrap' }}>
      <StatCard
        label={t('employeeExpense.mine.totalClaimed')}
        value={money(summary?.claimed_total ?? 0)}
        icon={<AppIcon name="expenses" fontSize="small" color="primary" />}
        loading={busy}
        hint={t('employeeExpense.mine.claimsFiled', {
          vars: { count: summary?.claim_count ?? 0 },
        })}
        sx={CARD_SX}
      />
      <StatCard
        label={t('employeeExpense.mine.awaitingReview')}
        value={money(summary?.pending_total ?? 0)}
        icon={<AppIcon name="timeline" fontSize="small" color="warning" />}
        loading={busy}
        hint={t('employeeExpense.mine.awaitingCount', { vars: { count: pending } })}
        hintColor={pending > 0 ? 'warning.main' : 'text.secondary'}
        sx={CARD_SX}
      />
      <StatCard
        label={t('employeeExpense.mine.approved')}
        value={money(summary?.approved_total ?? 0)}
        icon={<AppIcon name="payments" fontSize="small" color="success" />}
        loading={busy}
        hint={t('employeeExpense.mine.approvedCount', {
          vars: { count: summary?.approved_count ?? 0 },
        })}
        sx={CARD_SX}
      />
      <StatCard
        label={t('employeeExpense.mine.rejected')}
        value={money(summary?.rejected_total ?? 0)}
        icon={<AppIcon name="flag" fontSize="small" color="error" />}
        loading={busy}
        hint={t('employeeExpense.mine.rejectedCount', {
          vars: { count: summary?.rejected_count ?? 0 },
        })}
        sx={CARD_SX}
      />
    </Stack>
  );
}
