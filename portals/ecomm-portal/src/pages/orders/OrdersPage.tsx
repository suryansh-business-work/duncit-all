import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import StoreTable from '../../components/StoreTable';
import DocumentButtons from './DocumentButtons';
import { STORE_ORDERS_TABLE, type OrderRow } from './queries';
import { useOrderColumns } from './useOrderColumns';
import { useShipmentFile, type FileMode } from './useShipmentFile';

/**
 * Every pet-store order, newest first — open one to ship, settle or cancel it.
 * Each row prints or saves its own label; tick several to print or save their
 * labels, invoices or the pickup manifest as one PDF.
 */
export default function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const clearRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<OrderRow[]>([]);
  const file = useShipmentFile();
  // Depends on `run`, not on `file`: the hook hands back a new object each
  // render, and a new callback would rebuild the grid's columns every time.
  const onLabel = useCallback((row: OrderRow, mode: FileMode) => file.run([row.id], 'LABEL', mode), [file.run]);
  const columns = useOrderColumns(true, onLabel);
  const ids = selected.map((row) => row.id);

  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.orders')} subtitle={t('ecommPortal.orders.subtitle')} />
      {ids.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.5 }} role="region" aria-label={t('ecommPortal.shipping.bulkDocuments')}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" role="status" sx={{ fontWeight: 700, mr: 1 }}>
              {t('ecommPortal.shipping.ordersSelected', { count: ids.length })}
            </Typography>
            <DocumentButtons
              busy={file.busy}
              onRun={(kind, mode) => file.run(ids, kind, mode)}
              items={[
                { kind: 'LABEL', label: t('ecommPortal.shipping.labels') },
                { kind: 'INVOICE', label: t('ecommPortal.shipping.invoices') },
                { kind: 'MANIFEST', label: t('ecommPortal.shipping.manifest') },
              ]}
            />
          </Stack>
        </Paper>
      )}
      <StoreTable<OrderRow>
        tableId="ecomm-orders"
        query={STORE_ORDERS_TABLE}
        resultKey="storeOrdersTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.orders')}
        emptyText={t('ecommPortal.orders.empty')}
        searchPlaceholder={t('ecommPortal.orders.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        selection={{ onChange: setSelected, clearRef }}
        onRowClick={(order) => navigate(`/orders/${order.id}`)}
      />
    </Stack>
  );
}
