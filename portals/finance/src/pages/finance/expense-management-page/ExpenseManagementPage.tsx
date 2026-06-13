import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddIcon from '@mui/icons-material/Add';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { EXPENSES, EXPENSE_SUMMARY, labelize } from './queries';
import ExpenseFilters, { type ExpenseFilterState } from './ExpenseFilters';
import ExpenseTable from './ExpenseTable';
import ExpenseDrawer from './ExpenseDrawer';

const CURRENCY = '₹';
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};
const BLANK_FILTERS: ExpenseFilterState = {
  from: monthStart(),
  to: new Date(),
  category: '',
  payment_method: '',
  search: '',
  min_amount: '',
  max_amount: '',
};

const toFilterInput = (f: ExpenseFilterState) => ({
  from: f.from ? f.from.toISOString() : null,
  to: f.to ? f.to.toISOString() : null,
  category: f.category || null,
  payment_method: f.payment_method || null,
  search: f.search.trim() || null,
  min_amount: f.min_amount ? Number(f.min_amount) : null,
  max_amount: f.max_amount ? Number(f.max_amount) : null,
});

export default function ExpenseManagementPage() {
  const [filters, setFilters] = useState<ExpenseFilterState>(BLANK_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState<any | null>(null);

  const filter = toFilterInput(filters);
  const expensesQ = useQuery(EXPENSES, { variables: { filter }, fetchPolicy: 'cache-and-network' });
  const summaryQ = useQuery(EXPENSE_SUMMARY, { variables: { filter }, fetchPolicy: 'cache-and-network' });

  const refetch = () => {
    expensesQ.refetch();
    summaryQ.refetch();
  };
  const openNew = () => {
    setActive(null);
    setDrawerOpen(true);
  };
  const openRow = (expense: any) => {
    setActive(expense);
    setDrawerOpen(true);
  };

  const summary = summaryQ.data?.expenseSummary;
  const expenses = expensesQ.data?.expenses ?? [];

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
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            New expense
          </Button>
        </Stack>

        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <ExpenseFilters value={filters} onChange={setFilters} />
              {summary && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }} alignItems="center">
                  <Chip label={`Gross ${CURRENCY}${summary.gross_total.toFixed(2)}`} />
                  <Chip color="warning" label={`Refunds ${CURRENCY}${summary.refund_total.toFixed(2)}`} />
                  <Chip color="success" label={`Net ${CURRENCY}${summary.total.toFixed(2)}`} />
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {summary.count} expense{summary.count === 1 ? '' : 's'}
                  </Typography>
                </Stack>
              )}
              {summary && summary.by_category.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                  {summary.by_category.map((c: any) => (
                    <Chip key={c.category} size="small" variant="outlined" label={`${labelize(c.category)}: ${CURRENCY}${c.total.toFixed(2)}`} />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {expensesQ.loading && !expensesQ.data ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <ExpenseTable expenses={expenses} currency={CURRENCY} onRowClick={openRow} />
          )}
        </Stack>

        <ExpenseDrawer open={drawerOpen} expense={active} onClose={() => setDrawerOpen(false)} onSaved={refetch} />
      </Box>
    </LocalizationProvider>
  );
}
