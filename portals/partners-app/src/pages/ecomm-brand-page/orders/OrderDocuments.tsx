import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { downloadBase64File, parseApiError, printBase64File } from '@duncit/utils';
import { ORDER_SHIPMENT_FILE, type OrderDocumentKind, type OrderShipmentFile } from './orders.queries';

type Delivery = 'PRINT' | 'DOWNLOAD';

const ORDERS_LOGGER = logs.portal['partners-app'];

/**
 * The shipping label, the invoice and the pickup manifest, each printed in place or saved under the
 * order number. The server hands back the PDF itself — a browser can neither
 * print ShipRocket's cross-origin link in place nor rename what it saves.
 */
export default function OrderDocuments({ orderId }: Readonly<{ orderId: string }>) {
  const { t } = useTranslation();
  const [fetchFile, { loading }] = useMutation<{ brandProductOrderShipmentFile: OrderShipmentFile }>(ORDER_SHIPMENT_FILE);
  const documents: readonly { kind: OrderDocumentKind; label: string }[] = [
    { kind: 'LABEL', label: t('partners.orders.label') },
    { kind: 'INVOICE', label: t('partners.orders.invoice') },
    { kind: 'MANIFEST', label: t('partners.orders.manifest') },
  ];

  const deliver = async (kind: OrderDocumentKind, how: Delivery) => {
    try {
      const result = await fetchFile({ variables: { ids: [orderId], kind } });
      const file = result.data?.brandProductOrderShipmentFile;
      if (!file) {
        notifyError(t('partners.orders.documentMissing'));
        return;
      }
      if (how === 'PRINT') printBase64File(file.content_base64, file.mime, file.filename);
      else downloadBase64File(file.content_base64, file.filename, file.mime);
      notifySuccess(how === 'PRINT' ? t('partners.orders.printing') : t('partners.orders.downloaded'));
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  return (
    <Stack spacing={1}>
      {documents.map((doc) => {
        const labelId = `order-document-${doc.kind}`;
        return (
          <Stack key={doc.kind} direction="row" spacing={1} useFlexGap role="group" aria-labelledby={labelId} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography id={labelId} variant="body2" sx={{ fontWeight: 600, minWidth: 72 }}>
              {doc.label}
            </Typography>
            <DuncitButton size="small" variant="outlined" startIcon={<PrintIcon />} disabled={loading} onClick={() => fireAndForget(deliver(doc.kind, 'PRINT'), ORDERS_LOGGER, 'OrderDocuments', 'print')}>
              {t('partners.orders.print')}
            </DuncitButton>
            <DuncitButton size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={loading} onClick={() => fireAndForget(deliver(doc.kind, 'DOWNLOAD'), ORDERS_LOGGER, 'OrderDocuments', 'download')}>
              {t('partners.orders.download')}
            </DuncitButton>
          </Stack>
        );
      })}
    </Stack>
  );
}
