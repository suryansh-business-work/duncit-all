import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import FinanceSummary from './FinanceSummary';
import UserLog from './UserLog';
import { coinColumns } from './coinColumns';
import { paymentColumns, refundColumns } from './paymentColumns';
import {
  USER_COIN_TABLE,
  USER_FINANCE_SUMMARY,
  USER_PAYMENTS_TABLE,
  USER_REFUNDS_TABLE,
  type UserCoinRow,
  type UserPaymentRow,
  type UserRefundRow,
} from './queries';

/**
 * Admin › User › Payment & Refund Logs: the business this account has given
 * Duncit, then every payment, refund and Duncit Coin move it made.
 */
export default function UserFinanceSection({ userId }: Readonly<{ userId: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  // Same query FinanceSummary runs (one request): `coins` is null for a role
  // without the Duncit Coin read, whose ledger table the server would refuse.
  const { data } = useQuery(USER_FINANCE_SUMMARY, { variables: { user_id: userId }, skip: !userId });
  const canReadCoins = !!data?.userFinanceSummary.coins;

  const payments = useMemo(() => paymentColumns(t, formatDateTime), [t, formatDateTime]);
  const refunds = useMemo(() => refundColumns(t, formatDateTime), [t, formatDateTime]);
  const coins = useMemo(() => coinColumns(t, formatDateTime), [t, formatDateTime]);

  return (
    <Stack spacing={3} data-testid="user-finance-section">
      <FinanceSummary userId={userId} />
      <UserLog<UserPaymentRow>
        userId={userId}
        tableId="admin-user-payments"
        title={t('admin.userFinance.paymentsTitle')}
        emptyText={t('admin.userFinance.paymentsEmpty')}
        searchPlaceholder={t('admin.userFinance.search')}
        document={USER_PAYMENTS_TABLE}
        rootField="paymentsTable"
        columns={payments}
        defaultSortField="created_at"
      />
      <UserLog<UserRefundRow>
        userId={userId}
        tableId="admin-user-refunds"
        title={t('admin.userFinance.refundsTitle')}
        emptyText={t('admin.userFinance.refundsEmpty')}
        searchPlaceholder={t('admin.userFinance.search')}
        document={USER_REFUNDS_TABLE}
        rootField="userRefundsTable"
        columns={refunds}
        defaultSortField="refunded_at"
      />
      {canReadCoins && (
        <UserLog<UserCoinRow>
          userId={userId}
          tableId="admin-user-coins"
          title={t('admin.userFinance.coinsTitle')}
          emptyText={t('admin.userFinance.coinsEmpty')}
          searchPlaceholder={t('admin.userFinance.coinSearch')}
          document={USER_COIN_TABLE}
          rootField="coinTransactionsTable"
          columns={coins}
          defaultSortField="created_at"
        />
      )}
    </Stack>
  );
}
