import { useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import SectionCard from './SectionCard';
import { type PodPaymentRow } from './queries';
import { usePodDetailsScope } from './scope';
import { fmtDateTime, money } from './format';

const PAYMENT_STATUS_COLORS: StatusColorMap = {
  SUCCESS: 'success',
  PENDING: 'warning',
  FAILED: 'error',
  REFUNDED: 'info',
};

const STATUS_OPTIONS = ['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'].map((s) => ({
  value: s,
  label: s,
}));

const getRowId = (row: PodPaymentRow) => row.id;

const renderPayer = (row: PodPaymentRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="span">
      {row.user_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {row.user_email}
    </Typography>
  </Stack>
);

const renderStatus = (row: PodPaymentRow) => (
  <StatusChip status={row.status} colorMap={PAYMENT_STATUS_COLORS} />
);

interface Props {
  podId: string;
}

/** Every payment transaction of this pod — bookings, failures and refunds. */
export default function PodPaymentsSection({ podId }: Readonly<Props>) {
  const client = useApolloClient();
  const scopeDocs = usePodDetailsScope();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useApolloTableFetch<PodPaymentRow>(
    client,
    scopeDocs.payments,
    'paymentsTable',
    // ADMIN filters the platform-wide table down to this pod. CLUB_ADMIN hits an
    // operation that only ever reads ONE pod, so the pod travels as a variable
    // the server applies — a filter the caller could drop would be a hole.
    scopeDocs.scope === 'CLUB_ADMIN'
      ? { extraVariables: { pod_id: podId } }
      : { extraFilters: [{ field: 'pod_id', op: 'eq', value: podId }] },
    [podId, scopeDocs.scope],
  );

  const columns = useMemo<DuncitColumn<PodPaymentRow>[]>(
    () => [
      {
        field: 'payment_id',
        headerName: 'Payment ID',
        minWidth: 170,
        valueGetter: (row) => row.invoice_no ?? row.payment_id,
      },
      {
        field: 'user_name',
        headerName: 'Payer',
        flex: 1,
        minWidth: 190,
        cellRenderer: renderPayer,
        valueGetter: (row) => `${row.user_name} ${row.user_email}`,
      },
      {
        field: 'total',
        headerName: 'Amount',
        width: 120,
        valueGetter: (row) => money(row.currency_symbol, row.total),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      { field: 'gateway', headerName: 'Gateway', width: 120, valueGetter: (row) => row.gateway ?? '—' },
      {
        field: 'coupon_code',
        headerName: 'Coupon',
        width: 130,
        hide: true,
        valueGetter: (row) => row.coupon_code ?? '—',
      },
      {
        field: 'paid_at',
        headerName: 'Paid at',
        width: 170,
        filter: { type: 'date' },
        valueGetter: (row) => fmtDateTime(row.paid_at),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        width: 170,
        hide: true,
        filter: { type: 'date' },
        valueGetter: (row) => fmtDateTime(row.created_at),
      },
    ],
    [],
  );

  return (
    <SectionCard
      icon={<ReceiptLongIcon fontSize="small" />}
      title="Payments & transactions"
      tone="success"
    >
      <DuncitTable<PodPaymentRow>
        tableId="admin-pod-payments"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText="No payments recorded for this pod."
        searchPlaceholder="Search payment ID, invoice or payer"
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        refetchRef={refetchRef}
      />
    </SectionCard>
  );
}
