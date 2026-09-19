import { useId } from 'react';
import { Stack, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ShipmentDocument } from './shipping-queries';
import type { FileMode } from './useShipmentFile';

export interface DocumentItem {
  kind: ShipmentDocument;
  /** What the document is called here — "Label", or "Labels" for several orders. */
  label: string;
  disabled?: boolean;
}

interface DocumentButtonsProps {
  items: readonly DocumentItem[];
  busy: boolean;
  onRun: (kind: ShipmentDocument, mode: FileMode) => Promise<boolean>;
}

/**
 * Print and Download for each ShipRocket document. Each pair is a group
 * named by its document, so a screen reader hears "Label, Print".
 */
export default function DocumentButtons({ items, busy, onRun }: Readonly<DocumentButtonsProps>) {
  const { t } = useTranslation();
  const baseId = useId();
  return (
    <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
      {items.map((item) => {
        const labelId = `${baseId}-${item.kind}`;
        const off = busy || item.disabled;
        return (
          <Stack key={item.kind} direction="row" spacing={1} role="group" aria-labelledby={labelId} sx={{ alignItems: 'center' }}>
            <Typography id={labelId} variant="body2" sx={{ fontWeight: 700, minWidth: 64 }}>
              {item.label}
            </Typography>
            <DuncitButton size="small" variant="outlined" startIcon={<PrintIcon />} disabled={off} onClick={() => onRun(item.kind, 'PRINT')}>
              {t('ecommPortal.shipping.print')}
            </DuncitButton>
            <DuncitButton size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={off} onClick={() => onRun(item.kind, 'DOWNLOAD')}>
              {t('ecommPortal.shipping.download')}
            </DuncitButton>
          </Stack>
        );
      })}
    </Stack>
  );
}
