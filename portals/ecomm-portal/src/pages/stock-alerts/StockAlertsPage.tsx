import { useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { FlagChip } from '../../components/chips';
import StoreTable from '../../components/StoreTable';
import { useTableRefresh } from '../../components/useTableActions';
import { SEND_BACK_IN_STOCK, STORE_STOCK_ALERTS_TABLE, type StoreStockAlertRow } from './queries';

/**
 * Shoppers waiting on a sold-out product. The store emails them on its own
 * timer once the product is back; "Send now" runs that pass immediately.
 */
export default function StockAlertsPage() {
  const { t } = useTranslation();
  const { refetchRef, run } = useTableRefresh();
  const [send, sendState] = useMutation(SEND_BACK_IN_STOCK);

  const sendNow = async () => {
    let sent = 0;
    await run(async () => {
      const result = await send();
      sent = result.data?.storeSendBackInStock ?? 0;
    }, () => t('ecommPortal.stockAlerts.sent', { count: sent }));
  };

  const columns = useMemo<DuncitColumn<StoreStockAlertRow>[]>(() => {
    const renderState = (row: StoreStockAlertRow) => (
      <FlagChip on={Boolean(row.notified_at)} onLabel={t('ecommPortal.stockAlerts.notified')} offLabel={t('ecommPortal.stockAlerts.waiting')} />
    );
    return [
      { field: 'email', headerName: t('shell.common.email'), type: 'text', minWidth: 220, flex: 1 },
      { field: 'product_name', headerName: t('ecommPortal.common.product'), type: 'text', minWidth: 220, flex: 1, sortable: false, filterable: false },
      {
        field: 'variant_id',
        headerName: t('ecommPortal.stockAlerts.variant'),
        type: 'text',
        width: 200,
        hide: true,
        sortable: false,
        filterable: false,
        valueGetter: (row) => row.variant_id || EM_DASH,
      },
      { field: 'state', headerName: t('shell.common.status'), type: 'text', width: 130, sortable: false, filterable: false, cellRenderer: renderState },
      dateColumn<StoreStockAlertRow>({ headerName: t('ecommPortal.stockAlerts.subscribed'), hide: false, width: 150, filterable: false }),
      dateColumn<StoreStockAlertRow>({ field: 'notified_at', headerName: t('ecommPortal.stockAlerts.notifiedAt'), hide: false, width: 150 }),
    ];
  }, [t]);

  const sendButton = (
    <DuncitButton variant="contained" startIcon={<MarkEmailReadIcon />} loading={sendState.loading} onClick={sendNow}>
      {t('ecommPortal.stockAlerts.sendNow')}
    </DuncitButton>
  );

  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.stockAlerts')} subtitle={t('ecommPortal.stockAlerts.subtitle')} actions={sendButton} />
      <StoreTable<StoreStockAlertRow>
        tableId="ecomm-stock-alerts"
        query={STORE_STOCK_ALERTS_TABLE}
        resultKey="storeStockAlertsTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.stockAlerts')}
        emptyText={t('ecommPortal.stockAlerts.empty')}
        searchPlaceholder={t('ecommPortal.stockAlerts.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
