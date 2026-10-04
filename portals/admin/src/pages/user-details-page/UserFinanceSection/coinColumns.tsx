import { Chip } from '@mui/material';
import { EM_DASH, dateColumn, type DuncitColumn } from '@duncit/table';
import type { DateFormatter, useTranslation } from '@duncit/app-settings';
import type { UserCoinRow } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const typeOptions = (t: Translate) => [
  { value: 'CREDIT', label: t('admin.userFinance.credit') },
  { value: 'DEBIT', label: t('admin.userFinance.debit') },
];

/** WHY the coins moved — a backout refund and a purchase reward are both credits. Server twin: `CoinTxnSource`. */
const sourceOptions = (t: Translate) => [
  { value: 'PAYMENT_EARN', label: t('admin.userFinance.sourcePaymentEarn') },
  { value: 'PAYMENT_REDEEM', label: t('admin.userFinance.sourcePaymentRedeem') },
  { value: 'PAYMENT_REFUND', label: t('admin.userFinance.sourcePaymentRefund') },
  { value: 'REFERRAL_EARN', label: t('admin.userFinance.sourceReferralEarn') },
  { value: 'REFERRAL_SIGNUP', label: t('admin.userFinance.sourceReferralSignup') },
  { value: 'GIFT_CARD_REDEEM', label: t('admin.userFinance.sourceGiftCard') },
  { value: 'POD_FEEDBACK', label: t('admin.userFinance.sourcePodFeedback') },
  { value: 'ADMIN_GRANT', label: t('admin.userFinance.sourceAdminGrant') },
  { value: 'ADMIN_DEDUCT', label: t('admin.userFinance.sourceAdminDeduct') },
  { value: 'COIN_EXPIRY', label: t('admin.userFinance.sourceExpired') },
  { value: 'EARN_REVOKE', label: t('admin.userFinance.sourceEarnRevoke') },
];

/** The ledger as one running story: signed amounts, the balance after each move, and why it moved. */
export const coinColumns = (
  t: Translate,
  formatDateTime: DateFormatter['formatDateTime'],
): DuncitColumn<UserCoinRow>[] => {
  const sources = sourceOptions(t);
  const sourceLabel = new Map(sources.map((option) => [option.value, option.label]));
  return [
    dateColumn<UserCoinRow>({
      headerName: t('admin.userFinance.colCreatedAt'),
      hide: false,
      width: 170,
      formatDate: formatDateTime,
    }),
    {
      field: 'type',
      headerName: t('admin.userFinance.colType'),
      type: 'enum',
      options: typeOptions(t),
      width: 110,
      cellRenderer: (row) => (
        <Chip
          size="small"
          variant="outlined"
          color={row.type === 'CREDIT' ? 'success' : 'warning'}
          label={row.type === 'CREDIT' ? t('admin.userFinance.credit') : t('admin.userFinance.debit')}
        />
      ),
    },
    {
      field: 'amount',
      headerName: t('admin.userFinance.colCoins'),
      type: 'number',
      width: 110,
      valueGetter: (row) => `${row.type === 'CREDIT' ? '+' : '-'}${row.amount}`,
    },
    { field: 'balance_after', headerName: t('admin.userFinance.colBalanceAfter'), type: 'number', width: 130 },
    {
      field: 'source',
      headerName: t('admin.userFinance.colSource'),
      type: 'enum',
      options: sources,
      width: 170,
      valueGetter: (row) => sourceLabel.get(row.source) ?? row.source,
    },
    {
      field: 'payment_id',
      headerName: t('admin.userFinance.colPaymentId'),
      type: 'text',
      width: 170,
      valueGetter: (row) => row.payment_id || EM_DASH,
    },
    {
      field: 'reason',
      headerName: t('admin.userFinance.colReason'),
      type: 'text',
      flex: 1,
      minWidth: 180,
      valueGetter: (row) => row.reason || EM_DASH,
    },
  ];
};
