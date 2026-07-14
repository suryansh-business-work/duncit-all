import { useMemo, type MutableRefObject } from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { WithdrawalRow } from './queries';

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  PAID: 'success',
  REJECTED: 'error',
};

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

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
};

const account = (w: WithdrawalRow) =>
  w.payout_method === 'UPI' ? w.upi_id : `${w.account_number} · ${w.ifsc_code}`;

const getWithdrawalRowId = (w: WithdrawalRow) => w.id;

const renderHost = (w: WithdrawalRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="span">
      {w.beneficiary_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {w.beneficiary_email}
    </Typography>
  </Stack>
);

const renderAccount = (w: WithdrawalRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span">
      {w.payout_method}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {account(w)}
    </Typography>
  </Stack>
);

const renderStatus = (w: WithdrawalRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }} alignItems="flex-start">
    <Chip size="small" color={STATUS_COLOR[w.status] ?? 'default'} label={w.status} />
    {w.reject_reason ? (
      <Typography variant="caption" color="text.secondary" component="span">
        {w.reject_reason}
      </Typography>
    ) : null}
  </Stack>
);

interface Props {
  fetchRows: TableFetch<WithdrawalRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  reviewing: boolean;
  onMarkPaid: (w: WithdrawalRow) => void;
  onReject: (w: WithdrawalRow) => void;
}

export default function WithdrawalsTable({
  fetchRows,
  refetchRef,
  reviewing,
  onMarkPaid,
  onReject,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<WithdrawalRow>[]>(() => {
    const renderActions = (w: WithdrawalRow) => {
      if (w.status !== 'PENDING') return '—';
      return (
        <Stack direction="row" spacing={1} component="span">
          <Button size="small" variant="contained" disabled={reviewing} onClick={() => onMarkPaid(w)}>
            Mark paid
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
        headerName: 'Host',
        flex: 1,
        minWidth: 180,
        cellRenderer: renderHost,
        valueGetter: (w) => w.beneficiary_name,
      },
      {
        field: 'payout_method',
        headerName: 'Account',
        minWidth: 180,
        filter: { type: 'select', options: METHOD_OPTIONS },
        cellRenderer: renderAccount,
        valueGetter: (w) => `${w.payout_method} ${account(w)}`,
      },
      {
        field: 'scheduled_for',
        headerName: 'Scheduled',
        width: 120,
        filter: { type: 'date' },
        valueGetter: (w) => fmtDate(w.scheduled_for),
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 110,
        filter: { type: 'number' },
        valueGetter: (w) => `₹${Number(w.amount).toFixed(2)}`,
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
        width: 120,
        filter: { type: 'date' },
        valueGetter: (w) => fmtDate(w.requested_at),
      },
      { field: 'actions', headerName: 'Review', sortable: false, width: 200, cellRenderer: renderActions },
    ];
  }, [reviewing, onMarkPaid, onReject]);

  return (
    <DuncitTable<WithdrawalRow>
      tableId="finance-withdrawals"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getWithdrawalRowId}
      emptyText="No withdrawals yet."
      defaultSort={{ field: 'requested_at', dir: 'desc' }}
      searchPlaceholder="Search name, email, UPI or account"
      refetchRef={refetchRef}
    />
  );
}
