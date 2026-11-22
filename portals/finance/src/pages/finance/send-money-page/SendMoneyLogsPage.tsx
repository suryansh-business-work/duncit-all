import { useCallback, useMemo, useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { DuncitTable, EM_DASH, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { formatMoney, parseApiError } from '@duncit/utils';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { categoryLabel, categoryOptions, transferStatusLabel } from './categories';
import { RETRY_SEND_MONEY_TRANSFER, SEND_MONEY_TRANSFERS_TABLE, type TransferRow, type TransferStatus } from './queries';

const getTransferRowId = (row: TransferRow) => row.id;

const STATUS_COLOR: Record<TransferStatus, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  PENDING: 'warning',
  APPROVED: 'info',
  REJECTED: 'error',
  PROCESSING: 'info',
  PAID: 'success',
  FAILED: 'error',
};

/** A transfer can be pushed again when it failed, or has been sitting without confirmation. */
const canRetry = (row: TransferRow) => row.status === 'FAILED' || row.status === 'PROCESSING';

/**
 * Send Money Logs — every manual payment: who got it, how much and why, who
 * sent it and who approved it, when, the Razorpay transaction, and where the
 * bank stands. A failed or stalled transfer can be retried from here; a paid one
 * offers nothing, because there is nothing left to do.
 */
export default function SendMoneyLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<TransferRow>(client, SEND_MONEY_TRANSFERS_TABLE, 'sendMoneyTransfersTable');
  const [retry, { loading: retrying }] = useMutation(RETRY_SEND_MONEY_TRANSFER);

  const retryTransfer = useCallback(
    async (row: TransferRow) => {
      try {
        await retry({ variables: { id: row.transfer_id } });
        notifySuccess(t('finance.payouts.toastRetried'));
        refetchRef.current?.();
      } catch (e) {
        notifyError(parseApiError(e));
      }
    },
    [retry, t],
  );

  const columns = useMemo<DuncitColumn<TransferRow>[]>(
    () => [
      { field: 'created_at', headerName: t('finance.payouts.logWhen'), width: 180, type: 'date', valueGetter: (r) => formatDateTime(r.created_at) },
      {
        field: 'recipient_name',
        headerName: t('finance.payouts.recipient'),
        flex: 1,
        minWidth: 190,
        type: 'text',
        cellRenderer: (r: TransferRow) => (
          <Stack component="span" sx={{ lineHeight: 1.2 }}>
            <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>{r.recipient_name}</Typography>
            <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>{r.recipient_email}</Typography>
          </Stack>
        ),
        valueGetter: (r) => `${r.recipient_name} ${r.recipient_email}`.trim(),
      },
      {
        field: 'amount',
        headerName: t('finance.common.amount'),
        width: 140,
        type: 'number',
        valueGetter: (r) => formatMoney(r.amount, { decimals: 2 }),
      },
      {
        field: 'category',
        headerName: t('finance.payouts.category'),
        width: 160,
        type: 'enum',
        options: categoryOptions(t),
        valueGetter: (r) => categoryLabel(t, r.category),
      },
      { field: 'reason', headerName: t('finance.common.reason'), flex: 1, minWidth: 200, type: 'text', sortable: false, filterable: false, valueGetter: (r) => r.reason },
      { field: 'notes', headerName: t('finance.payouts.notes'), hide: true, minWidth: 200, type: 'text', sortable: false, filterable: false, valueGetter: (r) => r.notes || EM_DASH },
      { field: 'supporting_reference', headerName: t('finance.payouts.supportingReference'), hide: true, width: 170, type: 'text', sortable: false, filterable: false, valueGetter: (r) => r.supporting_reference || EM_DASH },
      { field: 'initiated_by_name', headerName: t('finance.payouts.initiatedBy'), width: 170, type: 'text', valueGetter: (r) => r.initiated_by_name || EM_DASH },
      { field: 'approved_by_name', headerName: t('finance.payouts.approvedBy'), width: 170, type: 'text', sortable: false, filterable: false, valueGetter: (r) => r.approved_by_name || EM_DASH },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 170,
        type: 'enum',
        options: (['PROCESSING', 'PAID', 'FAILED'] as const).map((value) => ({ value, label: transferStatusLabel(t, value) })),
        cellRenderer: (r: TransferRow) => (
          <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
            <Chip size="small" color={STATUS_COLOR[r.status]} label={transferStatusLabel(t, r.status)} />
            {r.failure_reason && r.status === 'FAILED' ? (
              <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>{r.failure_reason}</Typography>
            ) : null}
          </Stack>
        ),
        valueGetter: (r) => r.status,
      },
      { field: 'razorpay_payout_id', headerName: t('finance.payouts.logPayoutId'), width: 190, type: 'text', sortable: false, filterable: false, valueGetter: (r) => r.razorpay_payout_id || EM_DASH },
      { field: 'utr', headerName: t('finance.payouts.logReference'), width: 170, type: 'text', sortable: false, filterable: false, valueGetter: (r) => r.utr || EM_DASH },
      {
        field: 'actions',
        headerName: t('finance.withdrawals.review'),
        type: 'actions',
        width: 150,
        cellRenderer: (r: TransferRow) =>
          canRetry(r) ? (
            <DuncitButton size="small" variant="outlined" disabled={retrying} onClick={() => retryTransfer(r)}>
              {r.status === 'PROCESSING' && r.razorpay_payout_id ? t('finance.payouts.refreshStatus') : t('finance.payouts.retryPayout')}
            </DuncitButton>
          ) : (
            EM_DASH
          ),
      },
    ],
    [t, retrying, retryTransfer],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
        <ReceiptLongIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
            {t('finance.payouts.sendLogsTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('finance.payouts.sendLogsSubtitle')}
          </Typography>
        </Box>
      </Stack>
      <DuncitTable<TransferRow>
        ariaLabel={t('finance.payouts.sendLogsTitle')}
        tableId="finance-send-money-logs"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getTransferRowId}
        emptyText={t('finance.payouts.sendLogsEmpty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('finance.payouts.sendLogsSearch')}
        refetchRef={refetchRef}
      />
    </Box>
  );
}
