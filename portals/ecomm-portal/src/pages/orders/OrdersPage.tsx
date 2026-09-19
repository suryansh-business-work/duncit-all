import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Paper, Stack, Typography } from '@mui/material';
import LabelIcon from '@mui/icons-material/Label';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import StoreTable from '../../components/StoreTable';
import { runAction } from '../../lib/actions';
import { openDocument } from './order-detail/useShipmentActions';
import { STORE_ORDERS_TABLE, type OrderRow } from './queries';
import { SHIPMENT_DOCUMENT, type ShipmentDocument } from './shipping-queries';
import { useOrderColumns } from './useOrderColumns';

const DOCUMENTS: { kind: ShipmentDocument; labelKey: string; icon: typeof LabelIcon }[] = [
  { kind: 'LABEL', labelKey: 'ecommPortal.shipping.labels', icon: LabelIcon },
  { kind: 'INVOICE', labelKey: 'ecommPortal.shipping.invoices', icon: ReceiptLongIcon },
  { kind: 'MANIFEST', labelKey: 'ecommPortal.shipping.manifest', icon: AssignmentIcon },
];

/**
 * Every pet-store order, newest first — open one to ship, settle or cancel it.
 * Tick several to print their labels, invoices or the pickup manifest as one PDF.
 */
export default function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const columns = useOrderColumns();
  const clearRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<OrderRow[]>([]);
  const [makeDocument, documentState] = useMutation(SHIPMENT_DOCUMENT);
  const ids = selected.map((row) => row.id);

  const print = async (kind: ShipmentDocument) => {
    let url = '';
    const done = await runAction(async () => {
      const result = await makeDocument({ variables: { ids, kind } });
      url = result.data?.storeShipmentDocument ?? '';
    }, t('ecommPortal.shipping.documentReady'));
    if (done && url) openDocument(url);
  };

  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.orders')} subtitle={t('ecommPortal.orders.subtitle')} />
      {ids.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.5 }} role="region" aria-label={t('ecommPortal.shipping.bulkDocuments')}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" role="status" sx={{ fontWeight: 700, mr: 1 }}>
              {t('ecommPortal.shipping.ordersSelected', { count: ids.length })}
            </Typography>
            {DOCUMENTS.map(({ kind, labelKey, icon: Icon }) => (
              <DuncitButton key={kind} size="small" variant="outlined" startIcon={<Icon />} disabled={documentState.loading} onClick={() => print(kind)}>
                {t(labelKey)}
              </DuncitButton>
            ))}
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
