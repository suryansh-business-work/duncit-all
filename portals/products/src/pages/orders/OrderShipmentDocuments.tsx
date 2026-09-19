import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { downloadBase64File, parseApiError, printBase64File } from '@duncit/utils';
import { PRODUCT_ORDER_SHIPMENT_FILE } from './queries';

type DocumentKind = 'LABEL' | 'INVOICE' | 'MANIFEST';
type Delivery = 'PRINT' | 'DOWNLOAD';

interface ShipmentFile {
  filename: string;
  mime: string;
  content_base64: string;
}

/** Label and manifest exist once a courier is assigned (AWB); the invoice once ShipRocket has the order. */
const DOCUMENTS: readonly { kind: DocumentKind; labelKey: string; needsAwb: boolean }[] = [
  { kind: 'LABEL', labelKey: 'products.orders.label', needsAwb: true },
  { kind: 'INVOICE', labelKey: 'products.orders.invoice', needsAwb: false },
  { kind: 'MANIFEST', labelKey: 'products.orders.manifest', needsAwb: true },
];

interface OrderShipmentDocumentsProps {
  orderId: string;
  hasAwb: boolean;
}

/**
 * The shipment's ShipRocket PDFs, each printed in place or saved under the
 * order number. The server hands back the PDF itself — a browser can neither
 * print ShipRocket's cross-origin link in place nor rename what it saves.
 */
export default function OrderShipmentDocuments({ orderId, hasAwb }: Readonly<OrderShipmentDocumentsProps>) {
  const { t } = useTranslation();
  const [fetchFile, { loading }] = useMutation<{ productOrderShipmentFile: ShipmentFile }>(PRODUCT_ORDER_SHIPMENT_FILE);

  const deliver = async (kind: DocumentKind, how: Delivery) => {
    try {
      const result = await fetchFile({ variables: { ids: [orderId], kind } });
      const file = result.data?.productOrderShipmentFile;
      if (!file) {
        notifyError(t('products.orders.documentMissing'));
        return;
      }
      if (how === 'PRINT') printBase64File(file.content_base64, file.mime, file.filename);
      else downloadBase64File(file.content_base64, file.filename, file.mime);
      notifySuccess(how === 'PRINT' ? t('products.orders.printing') : t('products.orders.downloaded'));
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  return (
    <Stack spacing={1}>
      <Typography component="h3" variant="subtitle2">
        {t('products.orders.documents')}
      </Typography>
      {DOCUMENTS.map((doc) => {
        const labelId = `order-document-${doc.kind}`;
        const off = loading || (doc.needsAwb && !hasAwb);
        return (
          <Stack key={doc.kind} direction="row" spacing={1} useFlexGap role="group" aria-labelledby={labelId} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography id={labelId} variant="body2" sx={{ fontWeight: 600, minWidth: 72 }}>
              {t(doc.labelKey)}
            </Typography>
            <DuncitButton size="small" variant="outlined" startIcon={<PrintIcon />} disabled={off} onClick={() => deliver(doc.kind, 'PRINT')}>
              {t('products.orders.print')}
            </DuncitButton>
            <DuncitButton size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={off} onClick={() => deliver(doc.kind, 'DOWNLOAD')}>
              {t('products.orders.download')}
            </DuncitButton>
          </Stack>
        );
      })}
      {hasAwb ? null : (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('products.orders.needsAwb')}
        </Typography>
      )}
    </Stack>
  );
}
