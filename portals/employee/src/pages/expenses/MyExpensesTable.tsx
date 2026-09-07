import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Link, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { StatusChip } from '@duncit/ui';
import {
  DuncitTable,
  actionsColumn,
  dateColumn,
  useApolloTableFetch,
  type DuncitColumn,
  type TableFilterValue,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import {
  EMPLOYEE_EXPENSE_CATEGORIES,
  EMPLOYEE_EXPENSE_STATUS_COLORS,
  EMPLOYEE_EXPENSE_STATUS_KEYS,
  formatMoney,
  type EmployeeExpenseClaim,
} from '@duncit/utils';
import { MY_EXPENSES_TABLE, labelize } from './queries';

const CATEGORY_OPTIONS = EMPLOYEE_EXPENSE_CATEGORIES.map((c) => ({ value: c, label: labelize(c) }));
const getRowId = (row: EmployeeExpenseClaim) => row.id;
const isDecided = (row: EmployeeExpenseClaim) => row.status !== 'PENDING';

/** The claim reference, with what it was for underneath it. */
const renderClaim = (row: EmployeeExpenseClaim) => (
  <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
      {row.claim_id}
    </Typography>
    <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary', maxWidth: 220 }}>
      {row.description || labelize(row.category)}
    </Typography>
  </Stack>
);

interface Props {
  currency: string;
  externalFilters: readonly TableFilterValue[];
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (row: EmployeeExpenseClaim) => void;
  onWithdraw: (row: EmployeeExpenseClaim) => void;
}

/**
 * The employee's own claims.
 *
 * Edit and Withdraw stay VISIBLE on a decided claim and are disabled with a
 * reason, rather than disappearing: a row whose buttons vanish once Finance
 * answers reads as a bug, not as a rule.
 */
export default function MyExpensesTable({
  currency,
  externalFilters,
  refetchRef,
  toolbarActions,
  onEdit,
  onWithdraw,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<EmployeeExpenseClaim>(
    client,
    MY_EXPENSES_TABLE,
    'myEmployeeExpensesTable',
  );

  const columns = useMemo<DuncitColumn<EmployeeExpenseClaim>[]>(() => {
    const money = (value: number) =>
      formatMoney(value, { symbol: currency, decimals: 2, grouping: false });
    const statusLabel = (row: EmployeeExpenseClaim) => t(EMPLOYEE_EXPENSE_STATUS_KEYS[row.status]);
    const renderStatus = (row: EmployeeExpenseClaim) => (
      <StatusChip status={row.status} colorMap={EMPLOYEE_EXPENSE_STATUS_COLORS} label={statusLabel(row)} />
    );
    const renderBill = (row: EmployeeExpenseClaim) => {
      if (!row.bill_url) {
        return (
          <Typography variant="caption" component="span" sx={{ color: 'warning.main' }}>
            {t('employeeExpense.bill.missing')}
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
          {row.bill_number || t('employeeExpense.bill.view')}
        </Link>
      );
    };
    const lockedTitle = t('employeeExpense.mine.lockedHint');
    return [
      {
        field: 'claim_id',
        headerName: t('employeeExpense.col.claim'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderClaim,
        valueGetter: (row) => row.claim_id,
      },
      dateColumn<EmployeeExpenseClaim>({
        field: 'date',
        headerName: t('employeeExpense.col.date'),
        hide: false,
        width: 130,
      }),
      {
        field: 'category',
        headerName: t('employeeExpense.col.category'),
        minWidth: 150,
        filter: { type: 'select', options: CATEGORY_OPTIONS },
        valueGetter: (row) => labelize(row.category),
      },
      {
        field: 'merchant',
        headerName: t('employeeExpense.col.merchant'),
        minWidth: 150,
        valueGetter: (row) => row.merchant || '—',
      },
      {
        field: 'amount',
        headerName: t('employeeExpense.col.amount'),
        width: 130,
        filter: { type: 'number' },
        valueGetter: (row) => money(row.amount),
      },
      {
        field: 'bill_url',
        headerName: t('employeeExpense.col.bill'),
        sortable: false,
        width: 140,
        cellRenderer: renderBill,
        valueGetter: (row) => (row.bill_url ? row.bill_number : t('employeeExpense.bill.missing')),
      },
      {
        field: 'status',
        headerName: t('employeeExpense.col.status'),
        width: 160,
        cellRenderer: renderStatus,
        valueGetter: statusLabel,
      },
      actionsColumn<EmployeeExpenseClaim>({
        onEdit,
        onDelete: onWithdraw,
        edit: { disabled: isDecided, disabledTitle: lockedTitle },
        delete: {
          title: t('employeeExpense.mine.withdraw'),
          disabled: isDecided,
          disabledTitle: lockedTitle,
        },
      }),
    ];
  }, [currency, t, onEdit, onWithdraw]);

  return (
    <DuncitTable<EmployeeExpenseClaim>
      tableId="employee-my-expenses"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      externalFilters={externalFilters}
      toolbarActions={toolbarActions}
      emptyText={t('employeeExpense.mine.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('employeeExpense.mine.search')}
      refetchRef={refetchRef}
    />
  );
}
