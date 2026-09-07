import { useMemo, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Link, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { StatusChip } from '@duncit/ui';
import {
  DuncitTable,
  dateColumn,
  useApolloTableFetch,
  type DuncitColumn,
  type TableFilterValue,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import {
  EMPLOYEE_EXPENSE_CATEGORIES,
  EMPLOYEE_EXPENSE_PAYMENT_METHODS,
  EMPLOYEE_EXPENSE_STATUS_COLORS,
  EMPLOYEE_EXPENSE_STATUS_KEYS,
  formatMoney,
  type EmployeeExpenseClaim,
} from '@duncit/utils';
import { EMPLOYEE_EXPENSES_TABLE, labelize } from './queries';

const CATEGORY_OPTIONS = EMPLOYEE_EXPENSE_CATEGORIES.map((c) => ({ value: c, label: labelize(c) }));
const METHOD_OPTIONS = EMPLOYEE_EXPENSE_PAYMENT_METHODS.map((m) => ({
  value: m,
  label: labelize(m),
}));
const getRowId = (row: EmployeeExpenseClaim) => row.id;

/** Who filed it, over the claim reference Finance would quote back. */
const renderEmployee = (row: EmployeeExpenseClaim) => (
  <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
      {row.employee_name || row.employee_email}
    </Typography>
    <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
      {row.claim_id}
    </Typography>
  </Stack>
);

/**
 * What the money went on, in one cell.
 *
 * The queue already spends a wide column on the person, so category and payee
 * share one — a reviewer reads "Travel · Uber" as a single fact, and splitting
 * it costs the width the amount and the decision need.
 */
const renderSpend = (row: EmployeeExpenseClaim) => (
  <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" noWrap>
      {labelize(row.category)}
    </Typography>
    <Typography
      variant="caption"
      component="span"
      noWrap
      sx={{ color: 'text.secondary', maxWidth: 220 }}
    >
      {row.merchant || row.description}
    </Typography>
  </Stack>
);

interface Props {
  currency: string;
  externalFilters: readonly TableFilterValue[];
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (row: EmployeeExpenseClaim) => void;
}

/** Every employee's claims. Click a row to decide on it. */
export default function EmployeeExpensesTable({
  currency,
  externalFilters,
  refetchRef,
  onRowClick,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<EmployeeExpenseClaim>(
    client,
    EMPLOYEE_EXPENSES_TABLE,
    'employeeExpensesTable',
  );

  const columns = useMemo<DuncitColumn<EmployeeExpenseClaim>[]>(() => {
    const statusLabel = (row: EmployeeExpenseClaim) => t(EMPLOYEE_EXPENSE_STATUS_KEYS[row.status]);
    const renderStatus = (row: EmployeeExpenseClaim) => (
      <StatusChip
        status={row.status}
        colorMap={EMPLOYEE_EXPENSE_STATUS_COLORS}
        label={statusLabel(row)}
      />
    );
    const renderBill = (row: EmployeeExpenseClaim) =>
      row.bill_url ? (
        <Link
          href={row.bill_url}
          target="_blank"
          rel="noreferrer"
          variant="caption"
          onClick={(event) => event.stopPropagation()}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <ReceiptLongIcon fontSize="inherit" />
          {row.bill_number || t('employeeExpense.bill.view')}
        </Link>
      ) : (
        <Typography variant="caption" component="span" sx={{ color: 'warning.main' }}>
          {t('employeeExpense.bill.missing')}
        </Typography>
      );
    return [
      {
        field: 'employee_name',
        headerName: t('employeeExpense.col.employee'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderEmployee,
        valueGetter: (row) => row.employee_name || row.employee_email,
      },
      {
        field: 'status',
        headerName: t('employeeExpense.col.status'),
        width: 160,
        // No column filter: the tab strip above already pins the status, and two
        // controls setting the same field disagree the moment one is changed.
        cellRenderer: renderStatus,
        valueGetter: statusLabel,
      },
      {
        field: 'category',
        headerName: t('employeeExpense.col.spend'),
        minWidth: 190,
        filter: { type: 'select', options: CATEGORY_OPTIONS },
        cellRenderer: renderSpend,
        valueGetter: (row) => labelize(row.category),
      },
      {
        field: 'amount',
        headerName: t('employeeExpense.col.amount'),
        width: 130,
        filter: { type: 'number' },
        valueGetter: (row) =>
          formatMoney(row.amount, { symbol: currency, decimals: 2, grouping: false }),
      },
      {
        field: 'payment_method',
        headerName: t('employeeExpense.form.paymentMethod'),
        width: 150,
        hide: true,
        filter: { type: 'select', options: METHOD_OPTIONS },
        valueGetter: (row) => labelize(row.payment_method),
      },
      {
        field: 'bill_url',
        headerName: t('employeeExpense.col.bill'),
        sortable: false,
        width: 150,
        cellRenderer: renderBill,
        valueGetter: (row) => (row.bill_url ? row.bill_number : t('employeeExpense.bill.missing')),
      },
      dateColumn<EmployeeExpenseClaim>({
        field: 'date',
        headerName: t('employeeExpense.col.date'),
        hide: false,
        width: 130,
      }),
      dateColumn<EmployeeExpenseClaim>({
        field: 'reviewed_at',
        headerName: t('employeeExpense.col.reviewed'),
        width: 140,
        filterable: false,
      }),
    ];
  }, [currency, t]);

  return (
    <DuncitTable<EmployeeExpenseClaim>
      tableId="finance-employee-expenses"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onRowClick}
      externalFilters={externalFilters}
      emptyText={t('employeeExpense.review.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('employeeExpense.review.search')}
      refetchRef={refetchRef}
    />
  );
}
