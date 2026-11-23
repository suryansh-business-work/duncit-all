import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { EM_DASH, formatDateCell, type DuncitColumn } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import type { useTranslation } from '@duncit/app-settings';
import { accountDetails } from './account-details';
import type { WithdrawalRow } from './queries';
import { ROLE_OPTIONS, roleLabel } from './roles';
import {
  podShareOf,
  renderAccount,
  renderAmount,
  renderDecision,
  renderMethod,
  renderPayment,
  renderRole,
  renderWithdrawer,
  withdrawerSearchText,
} from './withdrawal-cells';
import { decisionOptions, paymentOptions } from './status-options';
import { rowActionOf } from './row-action';

type Translate = ReturnType<typeof useTranslation>['t'];

const METHOD_OPTIONS = [
  { value: 'UPI', label: 'UPI' },
  { value: 'IMPS', label: 'IMPS' },
  { value: 'NEFT', label: 'NEFT' },
];

export interface ColumnContext {
  t: Translate;
  /** The pod being drilled into, so Amount can name this pod's slice. */
  podId: string;
  busy: boolean;
  onReview: (w: WithdrawalRow) => void;
  onRetry: (w: WithdrawalRow) => void;
}

/** The withdrawals table's columns, as a plain function of what they read. */
export function buildWithdrawalColumns({ t, podId, busy, onReview, onRetry }: ColumnContext): DuncitColumn<WithdrawalRow>[] {
  const renderActions = (w: WithdrawalRow) => {
    const action = rowActionOf(w);
    if (action === 'NONE') return EM_DASH;
    return (
      <Stack direction="row" spacing={1} component="span">
        {action === 'ACCEPT' ? (
          <DuncitButton size="small" variant="contained" disabled={busy} onClick={() => onReview(w)}>
            {t('finance.payouts.accept')}
          </DuncitButton>
        ) : (
          <DuncitButton size="small" variant="contained" disabled={busy} onClick={() => onRetry(w)}>
            {action === 'REFRESH' ? t('finance.payouts.refreshStatus') : t('finance.payouts.retryPayout')}
          </DuncitButton>
        )}
        {w.payout_status === 'FAILED' ? (
          <DuncitButton size="small" color="error" variant="outlined" disabled={busy} onClick={() => onReview(w)}>
            {t('finance.payouts.decisionReject')}
          </DuncitButton>
        ) : null}
      </Stack>
    );
  };
  return [
    {
      field: 'beneficiary_name',
      headerName: t('finance.withdrawals.withdrawerName'),
      flex: 1,
      minWidth: 190,
      type: 'text',
      cellRenderer: renderWithdrawer,
      valueGetter: withdrawerSearchText,
    },
    {
      field: 'payout_method',
      headerName: t('finance.withdrawals.withdrawalMethod'),
      width: 160,
      type: 'enum',
      options: METHOD_OPTIONS,
      cellRenderer: renderMethod,
      valueGetter: (w) => w.payout_method,
    },
    {
      field: 'withdrawer_role',
      headerName: t('finance.withdrawals.role'),
      width: 170,
      type: 'enum',
      options: ROLE_OPTIONS,
      cellRenderer: renderRole,
      valueGetter: (w) => roleLabel(w.withdrawer_role),
    },
    {
      field: 'scheduled_for',
      headerName: t('finance.withdrawals.scheduled'),
      width: 130,
      type: 'date',
      valueGetter: (w) => formatDateCell(w.scheduled_for),
    },
    {
      field: 'amount',
      headerName: t('finance.common.amount'),
      width: 170,
      type: 'number',
      cellRenderer: (w: WithdrawalRow) => {
        const share = podShareOf(w, podId);
        const partial = w.requested_amount !== w.amount;
        let caption: string | null = null;
        if (partial) {
          caption = t('finance.payouts.requestedCaption', { vars: { amount: formatMoney(w.requested_amount, { decimals: 2 }) } });
        } else if (share !== null) {
          caption = t('finance.payouts.podShareCaption', { vars: { amount: formatMoney(share, { decimals: 2 }) } });
        }
        return renderAmount(formatMoney(w.amount, { decimals: 2 }), caption);
      },
      valueGetter: (w) => formatMoney(w.amount, { decimals: 2 }),
    },
    {
      field: 'account_number',
      headerName: t('finance.withdrawals.accountDetails'),
      flex: 1,
      minWidth: 200,
      type: 'text',
      // UPI handle or masked account + IFSC, picked per payout method — no one
      // stored path (and the raw account number is never offered as a filter).
      sortable: false,
      filterable: false,
      cellRenderer: renderAccount,
      valueGetter: accountDetails,
    },
    {
      field: 'approval_status',
      headerName: t('finance.payouts.decisionColumn'),
      minWidth: 170,
      type: 'enum',
      options: decisionOptions(t),
      cellRenderer: renderDecision,
      valueGetter: (w) => w.approval_status,
    },
    {
      field: 'payout_status',
      headerName: t('finance.payouts.paymentColumn'),
      minWidth: 150,
      type: 'enum',
      options: paymentOptions(t),
      cellRenderer: renderPayment,
      valueGetter: (w) => w.payout_status ?? EM_DASH,
    },
    // The references a withdrawer quotes to their bank — the same pair Withdrawal Logs shows.
    {
      field: 'razorpay_payout_id',
      headerName: t('finance.payouts.logPayoutId'),
      width: 190,
      type: 'text',
      sortable: false,
      filterable: false,
      valueGetter: (w) => w.razorpay_payout_id || EM_DASH,
    },
    {
      field: 'payout_utr',
      headerName: t('finance.payouts.logReference'),
      width: 170,
      type: 'text',
      sortable: false,
      filterable: false,
      valueGetter: (w) => w.payout_utr || EM_DASH,
    },
    {
      field: 'requested_at',
      headerName: t('finance.common.requested'),
      hide: true,
      width: 130,
      type: 'date',
      valueGetter: (w) => formatDateCell(w.requested_at),
    },
    {
      field: 'actions',
      headerName: t('finance.withdrawals.review'),
      type: 'actions',
      width: 230,
      cellRenderer: renderActions,
    },
  ];
}
