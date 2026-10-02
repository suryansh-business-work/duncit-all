import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { useExpenseOptions } from '../../expense-config';
import type { ExpenseRecord } from '../expense-form';
import { buildExpenseColumns } from './columns';

const getExpenseRowId = (row: ExpenseRecord) => row.id;

interface Props {
  fetchRows: TableFetch<ExpenseRecord>;
  refetchRef: MutableRefObject<(() => void) | null>;
  currency: string;
  toolbarActions?: ReactNode;
  onRowClick: (expense: ExpenseRecord) => void;
}

/**
 * The ledger table — click a row to open the detail/edit drawer.
 *
 * Every label on it comes from the configured option lists rather than from a
 * constant in this file, so a category renamed in Settings is renamed in the
 * table (and in its own filter dropdown) on the next read.
 */
export default function ExpenseTable({
  fetchRows,
  refetchRef,
  currency,
  toolbarActions,
  onRowClick,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const categories = useExpenseOptions('CATEGORY');
  const methods = useExpenseOptions('PAYMENT_METHOD');
  const relatedTypes = useExpenseOptions('RELATED_FROM_TYPE');

  const columns = useMemo<DuncitColumn<ExpenseRecord>[]>(
    () => buildExpenseColumns({ t, currency, categories, methods, relatedTypes }),
    [currency, t, categories, methods, relatedTypes],
  );

  return (
    <DuncitTable<ExpenseRecord>
      ariaLabel={t('shell.nav.expenses')}
      tableId="finance-expenses"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getExpenseRowId}
      onRowClick={onRowClick}
      toolbarActions={toolbarActions}
      emptyText={t('finance.expenseManagement.noExpensesMatchTheseFilters')}
      defaultSort={{ field: 'date', dir: 'desc' }}
      searchPlaceholder={t('finance.expenseManagement.searchExpenses')}
      refetchRef={refetchRef}
    />
  );
}
