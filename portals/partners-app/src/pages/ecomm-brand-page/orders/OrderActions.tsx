import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import EditLocationAltOutlined from '@mui/icons-material/EditLocationAltOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import type { BrandOrderActions } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { OrderAddressForm, orderAddressValues, type OrderAddressValues } from './order-address';
import { OrderCancelForm, type OrderCancelValues } from './order-cancel';
import { orderTotal } from './order-labels';
import { useOrderActions } from './useOrderActions';
import type { OrderRow } from './orders.queries';

interface Props {
  row: OrderRow;
  /** Worked out once by the details page, which also gates the documents on it. */
  allowed: BrandOrderActions;
  onUpdated: (row: OrderRow) => void;
}

const ADDRESS_TITLE_ID = 'order-address-title';
const CANCEL_TITLE_ID = 'order-cancel-title';
const ORDERS_LOGGER = logs.portal['partners-app'];

/** What the brand can do next with an order — only the steps the shared rule allows. */
export default function OrderActions({ row, allowed, onUpdated }: Readonly<Props>) {
  const { t } = useTranslation();
  const { run, busy } = useOrderActions(onUpdated);
  const [open, setOpen] = useState<'address' | 'cancel' | null>(null);
  const close = () => setOpen(null);
  const act = (action: 'book' | 'refresh') => fireAndForget(run(action, row.id), ORDERS_LOGGER, 'OrderActions', action);

  const saveAddress = async (values: OrderAddressValues) => {
    if (await run('address', row.id, { address: values })) close();
  };
  const cancelOrder = async (values: OrderCancelValues) => {
    if (await run('cancel', row.id, { reason: values.reason })) close();
  };

  if (!allowed.book && !allowed.editAddress && !allowed.refreshTracking && !allowed.cancel) return null;
  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {allowed.book && (
          <DuncitButton variant="contained" startIcon={<LocalShippingOutlined />} loading={busy === 'book'} onClick={() => act('book')} data-testid="order-book">
            {row.last_error ? t('partners.orders.retryBooking') : t('partners.orders.book')}
          </DuncitButton>
        )}
        {allowed.editAddress && (
          <DuncitButton variant="outlined" startIcon={<EditLocationAltOutlined />} onClick={() => setOpen('address')} data-testid="order-edit-address">
            {t('partners.orders.fixAddress')}
          </DuncitButton>
        )}
        {allowed.refreshTracking && (
          <DuncitButton variant="outlined" startIcon={<RefreshIcon />} loading={busy === 'refresh'} onClick={() => act('refresh')} data-testid="order-refresh-tracking">
            {t('partners.orders.refreshTracking')}
          </DuncitButton>
        )}
        {allowed.cancel && (
          <DuncitButton variant="outlined" color="error" startIcon={<CancelOutlined />} onClick={() => setOpen('cancel')} data-testid="order-cancel">
            {t('partners.orders.cancel')}
          </DuncitButton>
        )}
      </Stack>
      <Dialog open={open === 'address'} onClose={busy ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={ADDRESS_TITLE_ID}>
        <DialogTitle id={ADDRESS_TITLE_ID}>{t('partners.orders.address.title', { vars: { no: row.order_no } })}</DialogTitle>
        <DialogContent dividers>
          {open === 'address' && (
            <OrderAddressForm
              defaultValues={orderAddressValues(row.shipping_address)}
              busy={busy === 'address'}
              onSubmit={(values) => fireAndForget(saveAddress(values), ORDERS_LOGGER, 'OrderActions', 'address')}
              onCancel={close}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={open === 'cancel'} onClose={busy ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={CANCEL_TITLE_ID}>
        <DialogTitle id={CANCEL_TITLE_ID}>{t('partners.orders.cancelTitle', { vars: { no: row.order_no } })}</DialogTitle>
        <DialogContent dividers>
          {open === 'cancel' && (
            <OrderCancelForm
              consequence={t('partners.orders.cancelBody', { vars: { buyer: row.buyer_name, amount: orderTotal(row) } })}
              busy={busy === 'cancel'}
              onSubmit={(values) => fireAndForget(cancelOrder(values), ORDERS_LOGGER, 'OrderActions', 'cancel')}
              onCancel={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
