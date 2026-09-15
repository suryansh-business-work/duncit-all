import { useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import SectionCard from './SectionCard';
import { type PodPaymentRow } from './queries';
import { usePodDetailsScope } from './scope';
import { fmtDateTime, money } from './format';
import { useTranslation } from './i18n/useTranslation';

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
    <Typography variant="body2" component="span" sx={{
      fontWeight: 700
    }}>
      {row.user_name}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {row.user_email}
    </Typography>
  </Stack>
);

/** The tier frozen on the payment at checkout — amount and percentage — or a dash when none applied. */
const ticketDiscountValue = (row: PodPaymentRow) =>
  row.ticket_discount_amount > 0
    ? `${money(row.currency_symbol, row.ticket_discount_amount)} · ${row.ticket_discount_pct}%`
    : '—';

const renderStatus = (row: PodPaymentRow) => (
  <StatusChip status={row.status} colorMap={PAYMENT_STATUS_COLORS} />
);

interface Props {
  podId: string;
}

/** Every payment transaction of this pod — bookings, failures and refunds. */
export default function PodPaymentsSection({ podId }: Readonly<Props>) {
  const { t } = useTranslation();
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
        headerName: t('podDetailsPanel.podPaymentsSection.paymentId'),
        type: 'text',
        minWidth: 170,
        valueGetter: (row) => row.invoice_no ?? row.payment_id,
      },
      {
        field: 'user_name',
        headerName: t('podDetailsPanel.podPaymentsSection.payer'),
        type: 'text',
        flex: 1,
        minWidth: 190,
        cellRenderer: renderPayer,
        valueGetter: (row) => `${row.user_name} ${row.user_email}`,
      },
      {
        field: 'total',
        headerName: t('podDetailsPanel.podPaymentsSection.amount'),
        type: 'number',
        width: 120,
        valueGetter: (row) => money(row.currency_symbol, row.total),
      },
      {
        field: 'status',
        headerName: t('podDetailsPanel.common.status'),
        type: 'enum',
        options: STATUS_OPTIONS,
        width: 140,
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      { field: 'gateway', headerName: t('podDetailsPanel.podPaymentsSection.gateway'), type: 'text', width: 120, valueGetter: (row) => row.gateway ?? '—' },
      {
        field: 'coupon_code',
        headerName: t('podDetailsPanel.podPaymentsSection.coupon'),
        type: 'text',
        width: 130,
        hide: true,
        valueGetter: (row) => row.coupon_code ?? '—',
      },
      {
        field: 'ticket_discount_amount',
        headerName: t('podDetailsPanel.podPaymentsSection.ticketDiscount'),
        width: 160,
        hide: true,
        type: 'number',
        valueGetter: ticketDiscountValue,
      },
      {
        field: 'paid_at',
        headerName: t('podDetailsPanel.podPaymentsSection.paidAt'),
        type: 'date',
        width: 170,
        valueGetter: (row) => fmtDateTime(row.paid_at),
      },
      {
        field: 'created_at',
        headerName: t('podDetailsPanel.common.created'),
        type: 'date',
        width: 170,
        hide: true,
        valueGetter: (row) => fmtDateTime(row.created_at),
      },
    ],
    [],
  );

  return (
    <SectionCard
      icon={<ReceiptLongIcon fontSize="small" />}
      title={t('podDetailsPanel.podPaymentsSection.paymentsAndTransactions')}
      tone="success"
    >
      <DuncitTable<PodPaymentRow>
        tableId="admin-pod-payments"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('podDetailsPanel.podPaymentsSection.noPaymentsRecordedForThisPod')}
        searchPlaceholder="Search payment ID, invoice or payer"
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        refetchRef={refetchRef}
      />
    </SectionCard>
  );
}
