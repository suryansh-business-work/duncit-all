import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { DuncitTable, EM_DASH, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { PAYOUT_AUDIT_TABLE, type PayoutAuditRow } from './queries';
import { auditActionOptions, statusLabel } from './status-options';

const getAuditRowId = (row: PayoutAuditRow) => row.id;
const money = (amount: number | null) => (amount === null ? EM_DASH : formatMoney(amount, { decimals: 2 }));

/**
 * Withdrawal Logs — the permanent record of every action on a withdrawal: the
 * request's amount, what was approved, who decided and why, and what Razorpay
 * said about the payment.
 *
 * Read-only by construction: the rows come from an append-only collection that
 * the server will not edit or delete, so nothing here offers an action.
 */
export default function WithdrawalLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<PayoutAuditRow>(
    client,
    PAYOUT_AUDIT_TABLE,
    'payoutAuditTable',
    { extraVariables: { kind: 'WITHDRAWAL' } },
    [],
  );

  const columns = useMemo<DuncitColumn<PayoutAuditRow>[]>(
    () => [
      {
        field: 'created_at',
        headerName: t('finance.payouts.logWhen'),
        width: 180,
        type: 'date',
        valueGetter: (row) => formatDateTime(row.created_at),
      },
      {
        field: 'user_name',
        headerName: t('finance.withdrawals.withdrawerName'),
        flex: 1,
        minWidth: 170,
        type: 'text',
        valueGetter: (row) => row.user_name || EM_DASH,
      },
      {
        field: 'requested_amount',
        headerName: t('finance.payouts.requestedAmount'),
        width: 150,
        type: 'number',
        valueGetter: (row) => money(row.requested_amount),
      },
      {
        field: 'approved_amount',
        headerName: t('finance.payouts.approvedAmount'),
        width: 150,
        type: 'number',
        sortable: true,
        filterable: false,
        valueGetter: (row) => money(row.approved_amount),
      },
      {
        field: 'action',
        headerName: t('finance.payouts.logAction'),
        width: 210,
        type: 'enum',
        options: auditActionOptions(t),
        valueGetter: (row) => auditActionOptions(t).find((o) => o.value === row.action)?.label ?? row.action,
      },
      {
        field: 'reason',
        headerName: t('finance.common.reason'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (row) => row.reason || EM_DASH,
      },
      {
        field: 'actor_name',
        headerName: t('finance.payouts.logBy'),
        width: 190,
        type: 'text',
        valueGetter: (row) => (row.actor_role ? `${row.actor_name} (${row.actor_role})` : row.actor_name) || EM_DASH,
      },
      {
        field: 'payment_status',
        headerName: t('finance.payouts.paymentColumn'),
        width: 150,
        type: 'enum',
        options: [
          { value: 'PROCESSING', label: statusLabel(t, 'PROCESSING') },
          { value: 'PAID', label: statusLabel(t, 'PAID') },
          { value: 'FAILED', label: statusLabel(t, 'FAILED') },
          { value: 'REJECTED', label: statusLabel(t, 'REJECTED') },
        ],
        valueGetter: (row) => (row.payment_status ? statusLabel(t, row.payment_status) : EM_DASH),
      },
      {
        field: 'razorpay_payout_id',
        headerName: t('finance.payouts.logPayoutId'),
        width: 190,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (row) => row.razorpay_payout_id || EM_DASH,
      },
      {
        field: 'utr',
        headerName: t('finance.payouts.logReference'),
        width: 170,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (row) => row.utr || EM_DASH,
      },
      {
        field: 'subject_id',
        headerName: t('finance.payouts.logWithdrawalId'),
        width: 170,
        type: 'text',
        hide: true,
        valueGetter: (row) => row.subject_id,
      },
    ],
    [t],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
        <ReceiptLongIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
            {t('finance.payouts.logsTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('finance.payouts.logsSubtitle')}
          </Typography>
        </Box>
      </Stack>
      <DuncitTable<PayoutAuditRow>
        ariaLabel={t('finance.payouts.logsTitle')}
        tableId="finance-withdrawal-logs"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getAuditRowId}
        emptyText={t('finance.payouts.logsEmpty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('finance.payouts.logsSearch')}
      />
    </Box>
  );
}
