import { useMemo, type MutableRefObject } from 'react';
import { Button, Stack } from '@mui/material';
import {
  DuncitTable,
  EM_DASH,
  formatDateCell,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { accountDetails } from './account-details';
import type { WithdrawalRow } from './queries';
import { roleLabel } from './roles';
import {
  podShareOf,
  renderAccount,
  renderAmount,
  renderMethod,
  renderRole,
  renderStatus,
  renderWithdrawer,
  withdrawerSearchText,
} from './withdrawal-cells';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' },
];

const METHOD_OPTIONS = [
  { value: 'UPI', label: 'UPI' },
  { value: 'IMPS', label: 'IMPS' },
  { value: 'NEFT', label: 'NEFT' },
];

const getWithdrawalRowId = (w: WithdrawalRow) => w.id;

interface Props {
  /** Namespaces the column layout this table persists — never share one. */
  tableId: string;
  /** The pod being drilled into, so Amount can name this pod's slice. */
  podId: string;
  fetchRows: TableFetch<WithdrawalRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  reviewing: boolean;
  emptyText: string;
  onMarkPaid: (w: WithdrawalRow) => void;
  onReject: (w: WithdrawalRow) => void;
}

export default function WithdrawalsTable({
  tableId,
  podId,
  fetchRows,
  refetchRef,
  reviewing,
  emptyText,
  onMarkPaid,
  onReject,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<WithdrawalRow>[]>(() => {
    const renderReview = (w: WithdrawalRow) => {
      if (w.status !== 'PENDING') return EM_DASH;
      return (
        <Stack direction="row" spacing={1} component="span">
          <Button size="small" variant="contained" disabled={reviewing} onClick={() => onMarkPaid(w)}>
            Mark Paid
          </Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            disabled={reviewing}
            onClick={() => onReject(w)}
          >
            Reject
          </Button>
        </Stack>
      );
    };
    return [
      {
        field: 'beneficiary_name',
        headerName: 'Withdrawer Name',
        flex: 1,
        minWidth: 190,
        cellRenderer: renderWithdrawer,
        valueGetter: withdrawerSearchText,
      },
      {
        field: 'payout_method',
        headerName: 'Withdrawal Method',
        width: 160,
        filter: { type: 'select', options: METHOD_OPTIONS },
        cellRenderer: renderMethod,
        valueGetter: (w) => w.payout_method,
      },
      {
        field: 'withdrawer_role',
        headerName: 'Role',
        width: 170,
        cellRenderer: renderRole,
        valueGetter: (w) => roleLabel(w.withdrawer_role),
      },
      {
        field: 'scheduled_for',
        headerName: 'Scheduled',
        width: 130,
        filter: { type: 'date' },
        valueGetter: (w) => formatDateCell(w.scheduled_for),
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 150,
        filter: { type: 'number' },
        cellRenderer: (w: WithdrawalRow) => {
          const share = podShareOf(w, podId);
          return renderAmount(
            formatMoney(w.amount, { decimals: 2 }),
            share === null ? null : formatMoney(share, { decimals: 2 }),
          );
        },
        valueGetter: (w) => formatMoney(w.amount, { decimals: 2 }),
      },
      {
        field: 'account_number',
        headerName: 'Account Details',
        flex: 1,
        minWidth: 200,
        sortable: false,
        cellRenderer: renderAccount,
        valueGetter: accountDetails,
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 150,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (w) => w.status,
      },
      {
        field: 'requested_at',
        headerName: 'Requested',
        hide: true,
        width: 130,
        filter: { type: 'date' },
        valueGetter: (w) => formatDateCell(w.requested_at),
      },
      { field: 'actions', headerName: 'Review', sortable: false, width: 210, cellRenderer: renderReview },
    ];
  }, [podId, reviewing, onMarkPaid, onReject]);

  return (
    <DuncitTable<WithdrawalRow>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getWithdrawalRowId}
      emptyText={emptyText}
      defaultSort={{ field: 'requested_at', dir: 'desc' }}
      searchPlaceholder="Search name, email, UPI or account"
      refetchRef={refetchRef}
    />
  );
}
