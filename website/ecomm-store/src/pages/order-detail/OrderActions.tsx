import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { downloadBase64File, parseApiError } from '@duncit/utils';

import { INVOICE_PDF, type StoreOrder } from '../../graphql/orders';
import { useStoreT } from '../../i18n';
import { CancelOrderDialog } from './cancel-order';
import { ReturnRequestDialog } from './return-request';

type Open = 'cancel' | 'return' | null;

/** Invoice download, and — when the order still allows it — cancel or return. */
export function OrderActions({ order, accessKey }: Readonly<{ order: StoreOrder; accessKey?: string }>) {
  const { t } = useStoreT();
  const client = useApolloClient();
  const { formatDate } = useDateFormat();
  const [open, setOpen] = useState<Open>(null);
  const [downloading, setDownloading] = useState(false);

  const downloadInvoice = async () => {
    setDownloading(true);
    try {
      const { data } = await client.query({ query: INVOICE_PDF, variables: { order_no: order.order_no, access_key: accessKey }, fetchPolicy: 'network-only' });
      if (data?.storeInvoicePdf) downloadBase64File(data.storeInvoicePdf, `${order.invoice_no || order.order_no}.pdf`, 'application/pdf');
    } catch (error) {
      notifyError(parseApiError(error, t('ecommStore.order.invoiceFailed')));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {order.invoice_no ? (
          <DuncitButton variant="outlined" startIcon={<ReceiptLongOutlinedIcon />} loading={downloading} onClick={downloadInvoice}>
            {t('ecommStore.order.invoice')}
          </DuncitButton>
        ) : null}
        {order.can_cancel ? (
          <DuncitButton variant="outlined" color="error" onClick={() => setOpen('cancel')}>
            {t('ecommStore.order.cancel')}
          </DuncitButton>
        ) : null}
        {order.can_return ? (
          <DuncitButton variant="contained" onClick={() => setOpen('return')}>
            {t('ecommStore.order.return')}
          </DuncitButton>
        ) : null}
      </Stack>
      {order.can_return && order.return_deadline ? (
        <Typography variant="caption" color="text.secondary">
          {t('ecommStore.order.returnBy', { vars: { date: formatDate(order.return_deadline) } })}
        </Typography>
      ) : null}
      {open === 'cancel' ? <CancelOrderDialog orderNo={order.order_no} accessKey={accessKey} onClose={() => setOpen(null)} /> : null}
      {open === 'return' ? <ReturnRequestDialog order={order} accessKey={accessKey} onClose={() => setOpen(null)} /> : null}
    </Stack>
  );
}
