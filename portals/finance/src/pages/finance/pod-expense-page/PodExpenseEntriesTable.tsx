import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { useApolloClient } from '@apollo/client';
import { Link, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import {
  DuncitTable,
  actionsColumn,
  dateColumn,
  useApolloTableFetch,
  type DuncitColumn,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import {
  POD_EXPENSES_TABLE,
  POD_EXPENSE_CATEGORIES,
  POD_EXPENSE_PAYMENT_METHODS,
  labelize,
  type PodExpenseRow,
} from './queries';

const CATEGORY_OPTIONS = POD_EXPENSE_CATEGORIES.map((c) => ({ value: c, label: labelize(c) }));
const METHOD_OPTIONS = POD_EXPENSE_PAYMENT_METHODS.map((m) => ({ value: m, label: labelize(m) }));

const getEntryRowId = (row: PodExpenseRow) => row.id;

const renderCategory = (row: PodExpenseRow) => (
  <Stack
    component="span"
    sx={{
      alignItems: "flex-start",
      lineHeight: 1.2
    }}>
    <Typography variant="body2" component="span">
      {labelize(row.category)}
    </Typography>
    {row.description ? (
      <Typography
        variant="caption"
        component="span"
        noWrap
        sx={{
          color: "text.secondary",
          maxWidth: 200
        }}>
        {row.description}
      </Typography>
    ) : null}
  </Stack>
);

interface Props {
  podDocId: string;
  currency: string;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (row: PodExpenseRow) => void;
  onDelete: (row: PodExpenseRow) => void;
}

/** One pod's expense entries, inside the drawer opened from the pods list. */
export default function PodExpenseEntriesTable({
  podDocId,
  currency,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<PodExpenseRow>(
    client,
    POD_EXPENSES_TABLE,
    'podExpensesTable',
    { extraVariables: { pod_doc_id: podDocId } },
    [podDocId],
  );

  const columns = useMemo<DuncitColumn<PodExpenseRow>[]>(() => {
    const money = (value: number) =>
      formatMoney(value, { symbol: currency, decimals: 2, grouping: false });
    const renderBill = (row: PodExpenseRow) => {
      if (!row.bill_url) {
        return (
          <Typography variant="caption" component="span" sx={{
            color: "warning.main"
          }}>
            {t('finance.podExpense.noBill')}
          </Typography>
        );
      }
      return (
        <Link
          href={row.bill_url}
          target="_blank"
          rel="noreferrer"
          variant="caption"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <ReceiptLongIcon fontSize="inherit" />
          {row.bill_number || t('finance.podExpense.viewBill')}
        </Link>
      );
    };
    return [
      dateColumn<PodExpenseRow>({
        field: 'date',
        headerName: t('finance.common.date'),
        hide: false,
        width: 120,
      }),
      {
        field: 'category',
        headerName: t('finance.expenseManagement.category'),
        flex: 1,
        minWidth: 170,
        filter: { type: 'select', options: CATEGORY_OPTIONS },
        cellRenderer: renderCategory,
        valueGetter: (row) => labelize(row.category),
      },
      {
        field: 'vendor_name',
        headerName: t('finance.expenseManagement.vendor'),
        minWidth: 140,
        valueGetter: (row) => row.vendor_name || '—',
      },
      {
        field: 'payment_method',
        headerName: t('finance.expenseManagement.method'),
        width: 140,
        hide: true,
        filter: { type: 'select', options: METHOD_OPTIONS },
        valueGetter: (row) => labelize(row.payment_method),
      },
      {
        field: 'amount',
        headerName: t('finance.common.amount'),
        width: 120,
        filter: { type: 'number' },
        valueGetter: (row) => money(row.amount),
      },
      {
        field: 'bill_url',
        headerName: t('finance.podExpense.bill'),
        sortable: false,
        width: 140,
        cellRenderer: renderBill,
        valueGetter: (row) => row.bill_number || (row.bill_url ? '' : t('finance.podExpense.noBill')),
      },
      actionsColumn<PodExpenseRow>({ onEdit, onDelete }),
    ];
  }, [currency, t, onEdit, onDelete]);

  return (
    <DuncitTable<PodExpenseRow>
      tableId="finance-pod-expense-entries"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getEntryRowId}
      toolbarActions={toolbarActions}
      emptyText={t('finance.podExpense.noEntriesYet')}
      defaultSort={{ field: 'date', dir: 'desc' }}
      defaultPageSize={10}
      searchPlaceholder={t('finance.podExpense.searchEntries')}
      refetchRef={refetchRef}
    />
  );
}
