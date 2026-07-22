import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddIcon from '@mui/icons-material/Add';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import {
  EXPENSES_TABLE,
  EXPENSE_SUMMARY,
  labelize,
  tableStateToExpenseFilter,
  type ExpenseSummaryFilter,
} from './queries';
import { logs } from '@duncit/logs';
import ExpenseTable from './ExpenseTable';
import ExpenseDrawer from './ExpenseDrawer';

const CURRENCY = '₹';

export default function ExpenseManagementPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState<any>(null);

  // The summary chips share the table's filters: fetchRows mirrors the table's
  // query state into ExpenseFilterInput so both stay in sync.
  const [summaryFilter, setSummaryFilter] = useState<ExpenseSummaryFilter | undefined>(undefined);
  const summaryKeyRef = useRef('null');
  const summaryQ = useQuery(EXPENSE_SUMMARY, {
    variables: { filter: summaryFilter ?? null },
    fetchPolicy: 'cache-and-network',
  });

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const filter = tableStateToExpenseFilter(q);
      const key = JSON.stringify(filter ?? null);
      if (key !== summaryKeyRef.current) {
        summaryKeyRef.current = key;
        setSummaryFilter(filter);
      }
      const { data } = await client.query({
        query: EXPENSES_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.expensesTable.rows as any[], total: data.expensesTable.total as number };
    },
    [client],
  );

  const handleSaved = () => {
    refetchRef.current?.();
    summaryQ.refetch().catch((e) =>
      logs.portal['finance'].warn('ExpenseManagementPage', 'handleSaved', {
        error: e,
        msg: 'Expense summary refresh failed',
      }),
    );
  };
  const openNew = () => {
    setActive(null);
    setDrawerOpen(true);
  };
  const openRow = useCallback((expense: any) => {
    setActive(expense);
    setDrawerOpen(true);
  }, []);

  const summary = summaryQ.data?.expenseSummary;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <MenuBookIcon color="primary" sx={{ fontSize: 28 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>
              Duncit Expense Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track internal business expenses and refunds. Click a row to view, edit or refund.
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={2}>
          {summary && (
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <Chip label={`Gross ${CURRENCY}${summary.gross_total.toFixed(2)}`} />
                  <Chip color="warning" label={`Refunds ${CURRENCY}${summary.refund_total.toFixed(2)}`} />
                  <Chip color="success" label={`Net ${CURRENCY}${summary.total.toFixed(2)}`} />
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {summary.count} expense{summary.count === 1 ? '' : 's'}
                  </Typography>
                </Stack>
                {summary.by_category.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                    {summary.by_category.map((c: any) => (
                      <Chip key={c.category} size="small" variant="outlined" label={`${labelize(c.category)}: ${CURRENCY}${c.total.toFixed(2)}`} />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}

          <ExpenseTable
            fetchRows={fetchRows}
            refetchRef={refetchRef}
            currency={CURRENCY}
            onRowClick={openRow}
            toolbarActions={
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                New expense
              </Button>
            }
          />
        </Stack>

        <ExpenseDrawer open={drawerOpen} expense={active} onClose={() => setDrawerOpen(false)} onSaved={handleSaved} />
      </Box>
    </LocalizationProvider>
  );
}
