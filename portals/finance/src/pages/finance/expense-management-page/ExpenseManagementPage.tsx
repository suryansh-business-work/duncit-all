import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { formatMoney } from '@duncit/utils';
import ExpenseTable from './ExpenseTable';
import ExpenseDrawer from './ExpenseDrawer';
import { useExpenseOptions } from '../expense-config';
import type { ExpenseRecord } from './expense-form';
import {
  EXPENSES_TABLE,
  EXPENSE_SUMMARY,
  tableStateToExpenseFilter,
  type ExpenseSummaryFilter,
} from './queries';

interface SummaryData {
  expenseSummary: {
    total: number;
    gross_total: number;
    refund_total: number;
    count: number;
    by_category: Array<{ category: string; total: number }>;
  };
  publicFinanceSettings: { currency_symbol: string };
}

/**
 * Finance > Expenses > Duncit Expenses.
 *
 * The ledger of what Duncit spent, what it was for, and how much of it has
 * been paid back. The summary chips share the table's filters — `fetchRows`
 * mirrors the query state into `ExpenseFilterInput` — so the numbers above the
 * table always describe the rows inside it.
 */
export default function ExpenseManagementPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState<ExpenseRecord | null>(null);
  const categories = useExpenseOptions('CATEGORY');

  const [summaryFilter, setSummaryFilter] = useState<ExpenseSummaryFilter | undefined>(undefined);
  const summaryKeyRef = useRef('null');
  const summaryQ = useQuery<SummaryData>(EXPENSE_SUMMARY, {
    variables: { filter: summaryFilter ?? null },
    fetchPolicy: 'cache-and-network',
  });
  const currency = summaryQ.data?.publicFinanceSettings?.currency_symbol ?? '';
  const money = (value: number) =>
    formatMoney(value, { symbol: currency, decimals: 2, grouping: false });

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const filter = tableStateToExpenseFilter(q);
      const key = JSON.stringify(filter ?? null);
      if (key !== summaryKeyRef.current) {
        summaryKeyRef.current = key;
        setSummaryFilter(filter);
      }
      const { data } = await client.query<{
        expensesTable: { rows: ExpenseRecord[]; total: number };
      }>({
        query: EXPENSES_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data?.expensesTable.rows ?? [], total: data?.expensesTable.total ?? 0 };
    },
    [client],
  );

  const handleSaved = () => {
    refetchRef.current?.();
    summaryQ.refetch().catch((e) =>
      logs.portal.finance.warn('ExpenseManagementPage', 'handleSaved', {
        error: e,
        msg: 'Expense summary refresh failed',
      }),
    );
  };
  const openNew = () => {
    setActive(null);
    setDrawerOpen(true);
  };
  const openRow = useCallback((expense: ExpenseRecord) => {
    setActive(expense);
    setDrawerOpen(true);
  }, []);

  const summary = summaryQ.data?.expenseSummary;

  return (
    <Box>
      <PageHeader
        title={t('finance.expenseManagement.title')}
        subtitle={t('finance.expenseManagement.subtitle')}
        sx={{ mb: 3 }}
      />

      <Stack spacing={2}>
        {summary && (
          <Card variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap', alignItems: 'center' }}
              >
                <Chip label={`${t('finance.expenseManagement.gross')} ${money(summary.gross_total)}`} />
                <Chip
                  color="warning"
                  label={`${t('finance.common.refund')} ${money(summary.refund_total)}`}
                />
                <Chip color="success" label={`${t('finance.expenseManagement.net')} ${money(summary.total)}`} />
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('finance.expenseDashboard.expenseCount', { vars: { count: summary.count } })}
                </Typography>
              </Stack>
              {summary.by_category.length > 0 && (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1.5 }}>
                  {summary.by_category.map((row) => (
                    <Chip
                      key={row.category}
                      size="small"
                      variant="outlined"
                      label={`${categories.labelOf(row.category)}: ${money(row.total)}`}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        <ExpenseTable
          fetchRows={fetchRows}
          refetchRef={refetchRef}
          currency={currency}
          onRowClick={openRow}
          toolbarActions={
            <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>
              {t('finance.expenseManagement.newExpense')}
            </DuncitButton>
          }
        />
      </Stack>

      <ExpenseDrawer
        open={drawerOpen}
        expense={active}
        currency={currency}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
      />
    </Box>
  );
}
