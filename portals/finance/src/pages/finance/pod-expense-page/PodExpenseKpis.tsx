import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { AppIcon } from '@duncit/shell';
import { useTranslation } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import { labelize, type PodExpenseSummaryData } from './queries';

interface Props {
  summary?: PodExpenseSummaryData;
  currency: string;
  loading: boolean;
}

const CARD_SX = { borderRadius: 3, flex: '1 1 220px', minWidth: 220 } as const;

/** The four tiles above the pods list, plus the per-category split. */
export default function PodExpenseKpis({ summary, currency, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (value: number) =>
    formatMoney(value, { symbol: currency, decimals: 2, grouping: false });
  const missing = summary?.missing_bill_count ?? 0;

  return (
    <Stack spacing={2}>
      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2}>
        <StatCard
          label={t('finance.podExpense.totalPodSpend')}
          value={money(summary?.total_spent ?? 0)}
          icon={<AppIcon name="payments" fontSize="small" color="primary" />}
          loading={loading && !summary}
          hint={t('finance.podExpense.entriesRecorded', {
            vars: { count: summary?.expense_count ?? 0 },
          })}
          sx={CARD_SX}
        />
        <StatCard
          label={t('finance.podExpense.spentThisMonth')}
          value={money(summary?.this_month_spent ?? 0)}
          icon={<AppIcon name="insights" fontSize="small" color="success" />}
          loading={loading && !summary}
          sx={CARD_SX}
        />
        <StatCard
          label={t('finance.podExpense.podsCovered')}
          value={String(summary?.pods_covered ?? 0)}
          icon={<AppIcon name="analytics" fontSize="small" color="info" />}
          loading={loading && !summary}
          sx={CARD_SX}
        />
        <StatCard
          label={t('finance.podExpense.billsUploaded')}
          value={`${summary?.bill_count ?? 0} / ${summary?.expense_count ?? 0}`}
          icon={<AppIcon name="receipt" fontSize="small" color="warning" />}
          loading={loading && !summary}
          hint={t('finance.podExpense.billsMissing', { vars: { count: missing } })}
          hintColor={missing > 0 ? 'warning.main' : 'success.main'}
          sx={CARD_SX}
        />
      </Stack>

      {summary && summary.by_category.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {t('finance.podExpense.spendByCategory')}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
              {summary.by_category.map((row) => (
                <Chip
                  key={row.category}
                  size="small"
                  variant="outlined"
                  label={`${labelize(row.category)}: ${money(row.total)}`}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
