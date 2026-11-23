import { useMemo, type MutableRefObject } from 'react';
import { Chip } from '@mui/material';
import { DuncitTable, EM_DASH, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatDateTime, useTranslation, type Translator } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { STATUS_COLORS, fmt } from '../payment-logs-page/helpers';
import { renderPaymentCustomer, paymentIdsText, renderPaymentIds } from '../payment-logs-page/cells';
import { PAYMENT_SOURCES, paymentSourceLabels } from '../payment-logs-page/paymentSource';
import type { RoundOffRow } from './queries';

type T = Translator['t'];

const statusOptions = (t: T) => [
  { value: 'PENDING', label: t('finance.payment.statusPending') },
  { value: 'SUCCESS', label: t('finance.payment.statusSuccess') },
  { value: 'FAILED', label: t('finance.payment.statusFailed') },
  { value: 'REFUNDED', label: t('finance.payment.statusRefunded') },
];

const getRowId = (r: RoundOffRow) => r.id;

const dateText = (iso: string | null) => (iso ? formatDateTime(iso) || EM_DASH : EM_DASH);

const renderStatus = (r: RoundOffRow) => <StatusChip status={r.status} colorMap={STATUS_COLORS} />;

const makeRenderSource = (sourceLabel: (r: RoundOffRow) => string) => (r: RoundOffRow) => (
  <Chip size="small" variant="outlined" label={sourceLabel(r)} />
);

interface Props {
  fetchRows: TableFetch<RoundOffRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Opens the payment the round-off belongs to — its full checkout audit. */
  onOpen: (r: RoundOffRow) => void;
}

export default function RoundOffsTable({ fetchRows, refetchRef, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<RoundOffRow>[]>(() => {
    const labels = paymentSourceLabels(t);
    const sourceLabel = (r: RoundOffRow) => labels[r.source];
    return [
      {
        field: 'created_at',
        headerName: t('finance.payment.colWhen'),
        width: 170,
        type: 'date',
        valueGetter: (r) => dateText(r.created_at),
      },
      {
        field: 'payment_id',
        headerName: t('finance.payment.colIds'),
        minWidth: 280,
        type: 'text',
        cellRenderer: renderPaymentIds(t),
        valueGetter: (r) => paymentIdsText(t, r),
      },
      {
        field: 'user_name',
        headerName: t('finance.payment.colCustomer'),
        flex: 1,
        minWidth: 170,
        type: 'text',
        cellRenderer: renderPaymentCustomer,
        valueGetter: (r) => r.user_name,
      },
      {
        // Derived by the server from what the checkout froze on the payment, so
        // it filters there but has no stored column to sort by.
        field: 'source',
        headerName: t('finance.roundOffs.colSource'),
        width: 170,
        type: 'enum',
        sortable: false,
        options: PAYMENT_SOURCES.map((value) => ({ value, label: labels[value] })),
        cellRenderer: makeRenderSource(sourceLabel),
        valueGetter: sourceLabel,
      },
      {
        // total + coins − round-off: worked out per row, so there is nothing to sort or match on.
        field: 'bill_amount',
        headerName: t('finance.roundOffs.colBillAmount'),
        width: 170,
        type: 'number',
        sortable: false,
        filterable: false,
        valueGetter: (r) => fmt(r.bill_amount, r.currency_symbol),
      },
      {
        field: 'round_off',
        headerName: t('finance.payment.colRoundOff'),
        width: 120,
        type: 'number',
        valueGetter: (r) => fmt(r.round_off, r.currency_symbol),
      },
      {
        field: 'coins_redeemed',
        headerName: t('finance.payment.colCoinsUsed'),
        width: 120,
        hide: true,
        type: 'number',
        valueGetter: (r) => r.coins_redeemed,
      },
      {
        field: 'total',
        headerName: t('finance.payment.totalCharged'),
        width: 140,
        type: 'number',
        valueGetter: (r) => fmt(r.total, r.currency_symbol),
      },
      {
        field: 'status',
        headerName: t('finance.payment.colStatus'),
        width: 120,
        type: 'enum',
        options: statusOptions(t),
        cellRenderer: renderStatus,
        valueGetter: (r) => r.status,
      },
      {
        field: 'description',
        headerName: t('finance.payment.colDescription'),
        minWidth: 160,
        hide: true,
        sortable: false,
        filterable: false,
        type: 'text',
      },
      {
        field: 'paid_at',
        headerName: t('finance.payment.colPaidAt'),
        width: 170,
        hide: true,
        type: 'date',
        valueGetter: (r) => dateText(r.paid_at),
      },
    ];
  }, [t]);

  return (
    <DuncitTable<RoundOffRow>
      ariaLabel={t('finance.roundOffs.title')}
      tableId="finance-round-offs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('finance.roundOffs.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('finance.payment.logsSearch')}
      refetchRef={refetchRef}
    />
  );
}
