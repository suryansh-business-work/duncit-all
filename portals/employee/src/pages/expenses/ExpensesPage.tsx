import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Divider, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import {
  formatMoney,
  parseApiError,
  type EmployeeExpenseClaim,
  type EmployeeExpenseTotals,
} from '@duncit/utils';
import ExpenseKpis from './ExpenseKpis';
import MyExpensesTable from './MyExpensesTable';
import {
  DELETE_EXPENSE_CLAIM,
  MY_EXPENSE_SUMMARY,
  SCOPE_FILTERS,
  type ExpenseScope,
} from './queries';

interface SummaryQueryData {
  myEmployeeExpenseSummary: EmployeeExpenseTotals;
  publicFinanceSettings: { currency_symbol: string };
}

/**
 * Employee > My Expenses.
 *
 * One list of what this person is owed, and the form that adds to it. Nothing
 * here decides anything — the claim's status is Finance's answer, which is why
 * the tiles lead with what is still awaiting one.
 */
export default function ExpensesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const listRefetch = useRef<(() => void) | null>(null);
  const [pendingWithdraw, setPendingWithdraw] = useState<EmployeeExpenseClaim | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remove, removeState] = useMutation(DELETE_EXPENSE_CLAIM);

  const summaryQuery = useQuery<SummaryQueryData>(MY_EXPENSE_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const currency = summaryQuery.data?.publicFinanceSettings?.currency_symbol ?? '';

  const tabs = useTabParam<ExpenseScope>({
    items: [
      { value: 'all', label: t('employeeExpense.review.tabAll') },
      { value: 'pending', label: t('employeeExpense.review.tabPending') },
      { value: 'approved', label: t('employeeExpense.review.tabApproved') },
      { value: 'rejected', label: t('employeeExpense.review.tabRejected') },
    ],
    fallback: 'all',
  });
  const externalFilters = useMemo(() => SCOPE_FILTERS[tabs.value], [tabs.value]);

  const refetchSummary = summaryQuery.refetch;
  const afterWrite = useCallback(() => {
    listRefetch.current?.();
    refetchSummary().catch((e) =>
      logs.portal.employee.warn('ExpensesPage', 'afterWrite', {
        error: e,
        msg: 'Expense claim summary refresh failed',
      }),
    );
  }, [refetchSummary]);

  const openNew = () => navigate('/expenses/new');
  const openEdit = useCallback(
    (row: EmployeeExpenseClaim) => navigate(`/expenses/${row.id}/edit`),
    [navigate],
  );

  const confirmWithdraw = async (row: EmployeeExpenseClaim) => {
    try {
      await remove({ variables: { expense_doc_id: row.id } });
      setPendingWithdraw(null);
      afterWrite();
    } catch (e) {
      setPendingWithdraw(null);
      setError(parseApiError(e));
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('employeeExpense.mine.title')}
        subtitle={t('employeeExpense.mine.subtitle')}
        sx={{ mb: 3 }}
      />

      <Stack spacing={2}>
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

        <ExpenseKpis
          summary={summaryQuery.data?.myEmployeeExpenseSummary}
          currency={currency}
          loading={summaryQuery.loading}
        />

        <Box>
          <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />
          <Divider sx={{ mb: 2 }} />
          <MyExpensesTable
            currency={currency}
            externalFilters={externalFilters}
            refetchRef={listRefetch}
            onEdit={openEdit}
            onWithdraw={setPendingWithdraw}
            toolbarActions={
              <DuncitButton
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openNew}
              >
                {t('employeeExpense.mine.newClaim')}
              </DuncitButton>
            }
          />
        </Box>
      </Stack>

      {pendingWithdraw && (
        <ConfirmDialog
          open
          destructive
          busy={removeState.loading}
          title={t('employeeExpense.mine.withdrawTitle')}
          message={t('employeeExpense.mine.withdrawBody', {
            vars: {
              claim: pendingWithdraw.claim_id,
              amount: formatMoney(pendingWithdraw.amount, {
                symbol: currency,
                decimals: 2,
                grouping: false,
              }),
            },
          })}
          confirmLabel={t('employeeExpense.mine.withdraw')}
          onConfirm={() => confirmWithdraw(pendingWithdraw)}
          onClose={() => setPendingWithdraw(null)}
        />
      )}

    </Box>
  );
}
