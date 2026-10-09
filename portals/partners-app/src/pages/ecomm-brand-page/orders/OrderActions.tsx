import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import EditLocationAltOutlined from '@mui/icons-material/EditLocationAltOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import type { BrandOrderActions } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { OrderAddressForm, orderAddressValues, type OrderAddressValues } from './order-address';
import { useOrderActions } from './useOrderActions';
import type { OrderRow } from './orders.queries';

interface Props {
  row: OrderRow;
  /** Worked out once by the details page, which also gates the documents on it. */
  allowed: BrandOrderActions;
  onUpdated: (row: OrderRow) => void;
}

const ADDRESS_TITLE_ID = 'order-address-title';
const ORDERS_LOGGER = logs.portal['partners-app'];

/** What the brand can do next with an order — only the steps the shared rule allows. */
export default function OrderActions({ row, allowed, onUpdated }: Readonly<Props>) {
  const { t } = useTranslation();
  const { run, busy } = useOrderActions(onUpdated);
  const [editing, setEditing] = useState(false);
  const act = (action: 'book' | 'refresh') => fireAndForget(run(action, row.id), ORDERS_LOGGER, 'OrderActions', action);

  const saveAddress = async (values: OrderAddressValues) => {
    if (await run('address', row.id, values)) setEditing(false);
  };

  if (!allowed.book && !allowed.editAddress && !allowed.refreshTracking) return null;
  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {allowed.book && (
          <DuncitButton variant="contained" startIcon={<LocalShippingOutlined />} loading={busy === 'book'} onClick={() => act('book')} data-testid="order-book">
            {row.last_error ? t('partners.orders.retryBooking') : t('partners.orders.book')}
          </DuncitButton>
        )}
        {allowed.editAddress && (
          <DuncitButton variant="outlined" startIcon={<EditLocationAltOutlined />} onClick={() => setEditing(true)} data-testid="order-edit-address">
            {t('partners.orders.fixAddress')}
          </DuncitButton>
        )}
        {allowed.refreshTracking && (
          <DuncitButton variant="outlined" startIcon={<RefreshIcon />} loading={busy === 'refresh'} onClick={() => act('refresh')} data-testid="order-refresh-tracking">
            {t('partners.orders.refreshTracking')}
          </DuncitButton>
        )}
      </Stack>
      <Dialog open={editing} onClose={busy ? undefined : () => setEditing(false)} fullWidth maxWidth="sm" aria-labelledby={ADDRESS_TITLE_ID}>
        <DialogTitle id={ADDRESS_TITLE_ID}>{t('partners.orders.address.title', { vars: { no: row.order_no } })}</DialogTitle>
        <DialogContent dividers>
          {editing && (
            <OrderAddressForm
              defaultValues={orderAddressValues(row.shipping_address)}
              busy={busy === 'address'}
              onSubmit={(values) => fireAndForget(saveAddress(values), ORDERS_LOGGER, 'OrderActions', 'address')}
              onCancel={() => setEditing(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
