import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import StoreTable from '../../components/StoreTable';
import { STORE_PAYMENTS_TABLE, type StorePaymentRow } from './queries';
import { usePaymentColumns } from './usePaymentColumns';

/** Every payment the pet store took — online, cash on delivery, refunds — newest first. */
export default function PaymentLogsPage() {
  const { t } = useTranslation();
  const columns = usePaymentColumns();
  return (
    <Stack spacing={3} data-testid="payment-logs-page">
      <PageHeader title={t('ecommPortal.nav.paymentLogs')} subtitle={t('ecommPortal.paymentLogs.subtitle')} />
      <StoreTable<StorePaymentRow>
        tableId="ecomm-payments"
        query={STORE_PAYMENTS_TABLE}
        resultKey="storePaymentsTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.paymentLogs')}
        emptyText={t('ecommPortal.paymentLogs.empty')}
        searchPlaceholder={t('ecommPortal.paymentLogs.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
      />
    </Stack>
  );
}
