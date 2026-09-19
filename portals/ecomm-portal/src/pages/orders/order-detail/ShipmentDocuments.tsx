import { Divider, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import DocumentButtons from '../DocumentButtons';
import { useShipmentFile } from '../useShipmentFile';

interface ShipmentDocumentsProps {
  orderId: string;
  /** Label and manifest need a courier (AWB); the invoice only needs the booking. */
  hasAwb: boolean;
  /** Another shipment write is in flight. */
  busy: boolean;
}

/** The shipment's PDFs from ShipRocket — printed in place, or saved under the order number. */
export default function ShipmentDocuments({ orderId, hasAwb, busy }: Readonly<ShipmentDocumentsProps>) {
  const { t } = useTranslation();
  const file = useShipmentFile();
  return (
    <>
      <Divider sx={{ my: 2 }} />
      <Typography component="h4" variant="subtitle2" sx={{ mb: 1 }}>
        {t('ecommPortal.shipping.documents')}
      </Typography>
      <DocumentButtons
        busy={busy || file.busy}
        onRun={(kind, mode) => file.run([orderId], kind, mode)}
        items={[
          { kind: 'LABEL', label: t('ecommPortal.shipping.label'), disabled: !hasAwb },
          { kind: 'INVOICE', label: t('ecommPortal.shipping.invoice') },
          { kind: 'MANIFEST', label: t('ecommPortal.shipping.manifest'), disabled: !hasAwb },
        ]}
      />
      {hasAwb ? null : (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
          {t('ecommPortal.shipping.needsAwb')}
        </Typography>
      )}
    </>
  );
}
