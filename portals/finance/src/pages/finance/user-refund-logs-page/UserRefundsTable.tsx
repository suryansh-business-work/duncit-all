import { useMemo, type MutableRefObject } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { DuncitTable, EM_DASH, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatDateTime, useTranslation, type Translator } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { STATUS_COLORS, fmt } from '../payment-logs-page/helpers';
import { renderPaymentCustomer, renderPaymentIds } from '../payment-logs-page/cells';
import type { UserRefundRow } from './queries';

/** A refunded payment is REFUNDED once the whole booking came back, and stays
 * SUCCESS while the buyer keeps some seats — so the filter offers both. The
 * values are the PaymentStatus the server filters on, not copy. */
const statusOptions = (t: Translator['t']) => [
  { value: 'REFUNDED', label: t('finance.payment.statusRefunded') },
  { value: 'SUCCESS', label: t('finance.payment.statusSuccess') },
];

const getRefundRowId = (r: UserRefundRow) => r.id;

const dateText = (iso: string | null) => (iso ? formatDateTime(iso) || EM_DASH : EM_DASH);

const renderStatus = (r: UserRefundRow) => <StatusChip status={r.status} colorMap={STATUS_COLORS} />;

interface Props {
  fetchRows: TableFetch<UserRefundRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Opens the payment this refund reversed — its full checkout audit. */
  onOpen: (r: UserRefundRow) => void;
}

export default function UserRefundsTable({ fetchRows, refetchRef, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<UserRefundRow>[]>(() => {
    const fullLabel = t('finance.refundLogs.kindFull');
    const partialLabel = t('finance.refundLogs.kindPartial');
    const partialHint = t('finance.refundLogs.kindPartialHint');
    // Only the part refunds carry an explanation; a full one needs none, and a
    // Tooltip with an empty title would still wrap the chip for nothing.
    const renderKind = (r: UserRefundRow) => {
      const chip = (
        <Chip
          size="small"
          variant="outlined"
          color={r.partial ? 'warning' : 'default'}
          label={r.partial ? partialLabel : fullLabel}
        />
      );
      if (!r.partial) return chip;
      return <Tooltip title={partialHint}>{chip}</Tooltip>;
    };
    return [
      {
        field: 'refunded_at',
        headerName: t('finance.refundLogs.colRefundedAt'),
        width: 170,
        valueGetter: (r) => dateText(r.refunded_at),
      },
      {
        field: 'created_at',
        headerName: t('finance.payment.colWhen'),
        width: 160,
        filter: { type: 'date' },
        valueGetter: (r) => dateText(r.created_at),
      },
      {
        field: 'user_name',
        headerName: t('finance.payment.colCustomer'),
        flex: 1,
        minWidth: 170,
        cellRenderer: renderPaymentCustomer,
        valueGetter: (r) => r.user_name,
      },
      { field: 'description', headerName: t('finance.payment.colDescription'), minWidth: 160 },
      {
        field: 'subtotal',
        headerName: t('finance.payment.colSubtotal'),
        width: 100,
        valueGetter: (r) => fmt(r.subtotal, r.currency_symbol),
      },
      {
        field: 'platform_fee_amount',
        headerName: t('finance.payment.colFee'),
        width: 90,
        valueGetter: (r) => fmt(r.platform_fee_amount, r.currency_symbol),
      },
      {
        field: 'gst_amount',
        headerName: t('finance.payment.colGst'),
        width: 90,
        valueGetter: (r) => fmt(r.gst_amount, r.currency_symbol),
      },
      {
        field: 'total',
        headerName: t('finance.payment.colTotal'),
        width: 100,
        filter: { type: 'number' },
        valueGetter: (r) => fmt(r.total, r.currency_symbol),
      },
      {
        // Derived from the payment's metadata, so the server cannot sort on it.
        field: 'refund_amount',
        headerName: t('finance.refundLogs.colRefundAmount'),
        width: 130,
        sortable: false,
        valueGetter: (r) => fmt(r.refund_amount, r.currency_symbol),
      },
      {
        field: 'partial',
        headerName: t('finance.refundLogs.colKind'),
        width: 90,
        sortable: false,
        cellRenderer: renderKind,
        valueGetter: (r) => (r.partial ? partialLabel : fullLabel),
      },
      {
        field: 'refund_reason',
        headerName: t('finance.refundLogs.colReason'),
        minWidth: 160,
        sortable: false,
        valueGetter: (r) => r.refund_reason || EM_DASH,
      },
      {
        field: 'status',
        headerName: t('finance.payment.colStatus'),
        width: 120,
        filter: { type: 'select', options: statusOptions(t) },
        cellRenderer: renderStatus,
        valueGetter: (r) => r.status,
      },
      {
        field: 'payment_id',
        headerName: t('finance.payment.colIds'),
        minWidth: 190,
        cellRenderer: renderPaymentIds,
        valueGetter: (r) => [r.payment_id, r.invoice_no].filter(Boolean).join(' '),
      },
      {
        // Absent for a refund raised from this console — nobody else set it off.
        field: 'refund_initiated_by',
        headerName: t('finance.refundLogs.colInitiatedBy'),
        width: 150,
        hide: true,
        sortable: false,
        filter: { type: 'text' },
        valueGetter: (r) => r.refund_initiated_by || t('finance.refundLogs.initiatedByConsole'),
      },
      {
        field: 'gateway',
        headerName: t('finance.payment.colGateway'),
        width: 120,
        hide: true,
        filter: { type: 'text' },
      },
      {
        field: 'paid_at',
        headerName: t('finance.payment.colPaidAt'),
        width: 160,
        hide: true,
        sortable: false,
        valueGetter: (r) => dateText(r.paid_at),
      },
    ];
  }, [t]);

  return (
    <DuncitTable<UserRefundRow>
      tableId="finance-user-refunds"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRefundRowId}
      onRowClick={onOpen}
      emptyText={t('finance.refundLogs.empty')}
      defaultSort={{ field: 'refunded_at', dir: 'desc' }}
      searchPlaceholder={t('finance.refundLogs.search')}
      refetchRef={refetchRef}
    />
  );
}
