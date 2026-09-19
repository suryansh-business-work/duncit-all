import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { downloadBase64File, printBase64File } from '@duncit/utils';
import { runAction } from '../../lib/actions';
import { SHIPMENT_FILE, type ShipmentDocument } from './shipping-queries';

/** Print opens the browser's print dialog in place; download saves the PDF. */
export type FileMode = 'PRINT' | 'DOWNLOAD';

/**
 * A ShipRocket document for one or more orders, printed or saved. The server
 * hands back the PDF itself: a browser can neither print ShipRocket's
 * cross-origin link in place nor save it under a name that says which order.
 */
export function useShipmentFile() {
  const { t } = useTranslation();
  const [fetchFile, state] = useMutation(SHIPMENT_FILE);
  const run = useCallback(
    (ids: string[], kind: ShipmentDocument, mode: FileMode) =>
      runAction(
        async () => {
          const result = await fetchFile({ variables: { ids, kind } });
          const file = result.data?.storeShipmentFile;
          if (!file) throw new Error(t('ecommPortal.shipping.documentMissing'));
          if (mode === 'PRINT') printBase64File(file.content_base64, file.mime, file.filename);
          else downloadBase64File(file.content_base64, file.filename, file.mime);
        },
        mode === 'PRINT' ? t('ecommPortal.shipping.printing') : t('ecommPortal.shipping.downloaded'),
      ),
    [fetchFile, t],
  );
  return { run, busy: state.loading };
}
