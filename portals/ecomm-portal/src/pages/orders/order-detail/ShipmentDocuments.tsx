import { Divider, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LabelIcon from '@mui/icons-material/Label';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ShipmentDocument } from '../shipping-queries';

interface ShipmentDocumentsProps {
  /** Label and manifest need a courier (AWB); the invoice only needs the booking. */
  hasAwb: boolean;
  busy: boolean;
  onDocument: (kind: ShipmentDocument) => void;
}

/** The shipment's PDFs from ShipRocket — each opens in a new tab. */
export default function ShipmentDocuments({ hasAwb, busy, onDocument }: Readonly<ShipmentDocumentsProps>) {
  const { t } = useTranslation();
  return (
    <>
      <Divider sx={{ my: 2 }} />
      <Typography component="h4" variant="subtitle2" sx={{ mb: 1 }}>
        {t('ecommPortal.shipping.documents')}
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <DuncitButton size="small" variant="outlined" startIcon={<LabelIcon />} disabled={busy || !hasAwb} onClick={() => onDocument('LABEL')}>
          {t('ecommPortal.shipping.label')}
        </DuncitButton>
        <DuncitButton size="small" variant="outlined" startIcon={<ReceiptLongIcon />} disabled={busy} onClick={() => onDocument('INVOICE')}>
          {t('ecommPortal.shipping.invoice')}
        </DuncitButton>
        <DuncitButton size="small" variant="outlined" startIcon={<AssignmentIcon />} disabled={busy || !hasAwb} onClick={() => onDocument('MANIFEST')}>
          {t('ecommPortal.shipping.manifest')}
        </DuncitButton>
      </Stack>
    </>
  );
}
