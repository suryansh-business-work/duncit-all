import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Link, Stack, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, labelize } from './queries';

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: labelize(c) }));
const METHOD_OPTIONS = PAYMENT_METHODS.map((m) => ({ value: m, label: labelize(m) }));

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
};

const getExpenseRowId = (e: any) => e.id;

const renderCategory = (e: any) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }} alignItems="flex-start">
    <Chip size="small" label={labelize(e.category)} />
    {e.description ? (
      <Typography variant="caption" color="text.secondary" component="span" noWrap sx={{ maxWidth: 220 }}>
        {e.description}
      </Typography>
    ) : null}
  </Stack>
);

const renderVendor = (e: any) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }} alignItems="flex-start">
    <Typography variant="body2" component="span">
      {e.vendor_name || '—'}
    </Typography>
    {e.attachment_url ? (
      <Link href={e.attachment_url} target="_blank" rel="noreferrer" variant="caption">
        Receipt
      </Link>
    ) : null}
  </Stack>
);

interface Props {
  fetchRows: TableFetch<any>;
  refetchRef: MutableRefObject<(() => void) | null>;
  currency: string;
  toolbarActions?: ReactNode;
  onRowClick: (expense: any) => void;
}

/** Expense ledger table — click a row to open the detail/edit drawer. */
export default function ExpenseTable({
  fetchRows,
  refetchRef,
  currency,
  toolbarActions,
  onRowClick,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<any>[]>(() => {
    const renderRefund = (e: any) => {
      if (!(e.refund_total > 0)) return '—';
      return (
        <Typography variant="body2" color="warning.main" component="span">
          −{currency}{Number(e.refund_total).toFixed(2)}
        </Typography>
      );
    };
    const renderNet = (e: any) => (
      <Typography variant="body2" fontWeight={700} component="span">
        {currency}{Number(e.net_amount).toFixed(2)}
      </Typography>
    );
    return [
      { field: 'date', headerName: 'Date', width: 120, filter: { type: 'date' }, valueGetter: (e) => fmtDate(e.date) },
      {
        field: 'category',
        headerName: 'Category',
        flex: 1,
        minWidth: 190,
        filter: { type: 'select', options: CATEGORY_OPTIONS },
        cellRenderer: renderCategory,
        valueGetter: (e) => labelize(e.category),
      },
      {
        field: 'vendor_name',
        headerName: 'Vendor',
        minWidth: 150,
        cellRenderer: renderVendor,
        valueGetter: (e) => e.vendor_name || '—',
      },
      {
        field: 'payment_method',
        headerName: 'Method',
        width: 140,
        filter: { type: 'select', options: METHOD_OPTIONS },
        valueGetter: (e) => labelize(e.payment_method),
      },
      {
        field: 'amount',
        headerName: 'Gross',
        width: 110,
        filter: { type: 'number' },
        valueGetter: (e) => `${currency}${Number(e.amount).toFixed(2)}`,
      },
      {
        field: 'refund_total',
        headerName: 'Refund',
        sortable: false,
        width: 110,
        cellRenderer: renderRefund,
        valueGetter: (e) => (e.refund_total > 0 ? `−${currency}${Number(e.refund_total).toFixed(2)}` : '—'),
      },
      {
        field: 'net_amount',
        headerName: 'Net',
        sortable: false,
        width: 110,
        cellRenderer: renderNet,
        valueGetter: (e) => `${currency}${Number(e.net_amount).toFixed(2)}`,
      },
      {
        field: 'created_at',
        headerName: 'Created',
        hide: true,
        width: 120,
        filter: { type: 'date' },
        valueGetter: (e) => fmtDate(e.created_at),
      },
    ];
  }, [currency]);

  return (
    <DuncitTable<any>
      tableId="finance-expenses"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getExpenseRowId}
      onRowClick={onRowClick}
      toolbarActions={toolbarActions}
      emptyText="No expenses match these filters."
      defaultSort={{ field: 'date', dir: 'desc' }}
      searchPlaceholder="Search vendor, description or reference"
      refetchRef={refetchRef}
    />
  );
}
