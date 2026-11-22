import { useMemo } from 'react';
import {
  DuncitTable,
  LabeledIds,
  clientTableFetch,
  formatDateCell,
  labeledIdsText,
  rowMenuColumn,
  type DuncitColumn,
} from '@duncit/table';

export interface PayoutRowMock {
  id: string;
  payout_no: string;
  host_name: string;
  amount: number;
  payout_status: 'PENDING' | 'PAID' | 'ON_HOLD';
  is_instant: boolean;
  requested_at: string;
  /** The gateway's own transfer id — shown beside ours, each under its own name. */
  razorpay_payout_id: string | null;
}

export interface TypedColumnsMock {
  rows: PayoutRowMock[];
}

const PAYOUT_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'ON_HOLD', label: 'On hold' },
];

const payoutRowId = (row: PayoutRowMock) => row.id;

/** Two systems' ids for one payout: never one unlabelled stack. */
const payoutIds = (row: PayoutRowMock) => [
  { label: 'Razorpay payout', value: row.razorpay_payout_id },
  { label: 'Duncit ref', value: row.payout_no },
];

const PAYOUT_COLUMNS: DuncitColumn<PayoutRowMock>[] = [
  {
    field: 'payout_no',
    headerName: 'IDs',
    type: 'text',
    minWidth: 230,
    cellRenderer: (row) => <LabeledIds ids={payoutIds(row)} />,
    valueGetter: (row) => labeledIdsText(payoutIds(row)),
  },
  { field: 'host_name', headerName: 'Host', type: 'text', flex: 1, minWidth: 150 },
  { field: 'amount', headerName: 'Amount (₹)', type: 'number', width: 140 },
  { field: 'payout_status', headerName: 'Status', type: 'enum', options: PAYOUT_STATUS_OPTIONS, width: 140 },
  {
    field: 'is_instant',
    headerName: 'Instant',
    type: 'boolean',
    width: 120,
    valueGetter: (row) => (row.is_instant ? 'Yes' : 'No'),
  },
  {
    field: 'requested_at',
    headerName: 'Requested',
    type: 'date',
    width: 150,
    valueGetter: (row) => formatDateCell(row.requested_at),
  },
  // The row's extra actions behind a kebab (⋮) — a paid payout has nothing left to hold.
  rowMenuColumn<PayoutRowMock>({
    ariaLabel: (row) => `Options for ${row.payout_no}`,
    items: (row) => [
      { key: 'view', label: 'View payout', onClick: () => undefined },
      { key: 'hold', label: 'Put on hold', onClick: () => undefined, disabled: row.payout_status === 'PAID', destructive: true },
    ],
  }),
];

/**
 * One column of every type, over rows held in memory. Each header carries its
 * own sort and filter, and `clientTableFetch` compares the way the column's
 * type says — so the same controls a server table sends as a query are answered
 * here in the browser.
 */
export function TypedColumnsDemo({ rows }: Readonly<{ rows: PayoutRowMock[] }>) {
  const fetchRows = useMemo(
    () => clientTableFetch(rows, (row) => `${row.payout_no} ${row.razorpay_payout_id ?? ''} ${row.host_name}`, PAYOUT_COLUMNS),
    [rows],
  );
  return (
    <DuncitTable<PayoutRowMock>
      tableId="docs-demo-typed-columns"
      columns={PAYOUT_COLUMNS}
      fetchRows={fetchRows}
      getRowId={payoutRowId}
      defaultSort={{ field: 'requested_at', dir: 'desc' }}
      emptyText="No payouts"
    />
  );
}
