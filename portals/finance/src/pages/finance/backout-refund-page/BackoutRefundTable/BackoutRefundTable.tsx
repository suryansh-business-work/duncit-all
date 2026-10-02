import { useMemo, type MutableRefObject } from 'react';
import { Tooltip, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import {
  BACKOUT_STATUS_LABELS,
  canProcessRefund,
  fmtDate,
  money,
  type BackoutRefundRequest,
} from '../queries';
import { useTranslation } from '@duncit/app-settings';
import {
  BACKOUT_STATUS_OPTIONS,
  getBackoutRowId,
  renderBackoutNo,
  renderBackoutStatus,
  renderMember,
  renderRefundStatus,
} from './cells';

interface Props {
  fetchRows: TableFetch<BackoutRefundRequest>;
  refetchRef: MutableRefObject<(() => void) | null>;
  sym: string;
  onRowClick: (row: BackoutRefundRequest) => void;
  onRefund: (row: BackoutRefundRequest) => void;
}

/** Server-paged table of Backout requests. Rows navigate to detail; the Refund
 * button appears only for refund-eligible (Spot Filled) requests. */
export default function BackoutRefundTable({
  fetchRows,
  refetchRef,
  sym,
  onRowClick,
  onRefund,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<BackoutRefundRequest>[]>(() => {
    // Refund processing is enabled ONLY for Spot Filled requests (spec) —
    // Backout In Process / Backout Cancelled rows render a plain dash.
    const renderActions = (row: BackoutRefundRequest) => {
      if (!canProcessRefund(row)) {
        return (
          <Typography variant="caption" component="span" sx={{
            color: "text.secondary"
          }}>—
                      </Typography>
        );
      }
      return (
        <Tooltip title={t('finance.backoutRefund.processRefund')}>
          <DuncitButton size="small" color="warning" variant="outlined" onClick={() => onRefund(row)}>
            Refund
          </DuncitButton>
        </Tooltip>
      );
    };
    return [
      {
        field: 'backout_no',
        headerName: t('finance.backoutRefund.backoutId'),
        minWidth: 160,
        type: 'text',
        cellRenderer: renderBackoutNo,
        valueGetter: (row) => row.backout_no,
      },
      {
        field: 'user_name',
        headerName: t('finance.backoutRefund.member'),
        type: 'text',
        // Hydrated from the user after the page is fetched — no stored path.
        sortable: false,
        filterable: false,
        flex: 1,
        minWidth: 180,
        cellRenderer: renderMember,
        valueGetter: (row) => [row.user_name, row.user_email].filter(Boolean).join(' '),
      },
      {
        field: 'pod_title',
        headerName: t('finance.common.pod'),
        type: 'text',
        // Hydrated from the pod after the page is fetched — no stored path.
        sortable: false,
        filterable: false,
        minWidth: 160,
        valueGetter: (row) => row.pod?.pod_title ?? '—',
      },
      {
        field: 'backout_status',
        headerName: t('shell.common.status'),
        width: 170,
        type: 'enum',
        options: BACKOUT_STATUS_OPTIONS,
        cellRenderer: renderBackoutStatus,
        valueGetter: (row) => BACKOUT_STATUS_LABELS[row.backout_status],
      },
      {
        field: 'created_at',
        headerName: t('finance.backoutRefund.backedOut'),
        width: 170,
        type: 'date',
        valueGetter: (row) => fmtDate(row.backed_out_at),
      },
      {
        field: 'payment_amount',
        headerName: t('finance.common.amount'),
        type: 'number',
        width: 110,
        valueGetter: (row) => money(sym, Number(row.payment_amount ?? 0)),
      },
      {
        // Hidden by default: most backouts spend no coins, so an always-on
        // column of zeroes would push the ones that matter off the screen.
        field: 'coins_refunded',
        headerName: t('finance.backoutRefund.coinsBack'),
        type: 'number',
        hide: true,
        width: 110,
        valueGetter: (row) => Math.max(0, Math.floor(Number(row.coins_refunded) || 0)),
      },
      {
        field: 'refund_status',
        headerName: t('finance.backoutRefund.refundStatus'),
        type: 'text',
        // Derived per row from refund_processed_at / payment_id / status — no stored path.
        sortable: false,
        filterable: false,
        width: 150,
        cellRenderer: renderRefundStatus,
        valueGetter: (row) => row.refund_status,
      },
      {
        field: 'joined_at',
        headerName: t('finance.backoutRefund.joined'),
        hide: true,
        type: 'date',
        // Read off the hydrated pod member after the page is fetched — no stored path.
        sortable: false,
        filterable: false,
        width: 170,
        valueGetter: (row) => fmtDate(row.joined_at),
      },
      { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 110, cellRenderer: renderActions },
    ];
  }, [sym, onRefund]);

  return (
    <DuncitTable<BackoutRefundRequest>
      ariaLabel={t('finance.backoutRefund.backoutRefunds')}
      tableId="finance-backout-refunds"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getBackoutRowId}
      onRowClick={onRowClick}
      emptyText={t('finance.backoutRefund.noBackoutRefundRequestsYet')}
      searchPlaceholder="Search by Backout ID"
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      refetchRef={refetchRef}
    />
  );
}
