import { Stack, Typography } from '@mui/material';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { DuncitButton } from '@duncit/buttons';
import { SHIPMENT_DOCUMENTS, type ShipmentDocumentKind } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  busy: boolean;
  onDocument: (kind: ShipmentDocumentKind, mode: 'print' | 'download') => void;
}

/** The shipping label, GST invoice and pickup manifest — each printed in place
 * or saved as a PDF. Native twin: components/brand-orders/BrandOrderDocuments. */
export default function BrandOrderDocuments({ busy, onDocument }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} data-testid="brand-order-documents">
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('mweb.brandOrders.documents')}</Typography>
      {SHIPMENT_DOCUMENTS.map((doc) => (
        <Stack key={doc.kind} direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <DuncitButton variant="outlined" size="small" startIcon={<PrintRoundedIcon />} disabled={busy} onClick={() => onDocument(doc.kind, 'print')} data-testid={`brand-order-print-${doc.kind}`}>
            {t(doc.printKey)}
          </DuncitButton>
          <DuncitButton variant="outlined" size="small" startIcon={<DownloadRoundedIcon />} disabled={busy} onClick={() => onDocument(doc.kind, 'download')} data-testid={`brand-order-download-${doc.kind}`}>
            {t(doc.downloadKey)}
          </DuncitButton>
        </Stack>
      ))}
    </Stack>
  );
}
