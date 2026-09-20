import type { MouseEvent } from 'react';
import { Box, Tooltip } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { OrderRow } from './queries';
import type { FileMode } from './useShipmentFile';

/** Prints or saves one order's label; answers once the PDF is in hand so the button can show it is working. */
export type LabelAction = (row: OrderRow, mode: FileMode) => Promise<unknown>;

interface Props {
  row: OrderRow;
  onLabel: LabelAction;
}

/** The cell's clicks stop here so pressing an icon never also opens the order. */
const stop = (event: MouseEvent) => event.stopPropagation();

/**
 * Print and Download for one order's shipping label, on its row — so a label
 * is one click from the list, not a tick, a bar and a second click. Both
 * wait for a courier (AWB): ShipRocket has no label before one, and the
 * tooltip says so instead of leaving a dead icon.
 */
export default function LabelActionsCell({ row, onLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  const ready = Boolean(row.shiprocket.awb);
  const vars = { order: row.order_no };
  const items = [
    { mode: 'PRINT' as const, icon: <PrintIcon fontSize="small" />, label: t('ecommPortal.shipping.printLabelFor', { vars }) },
    { mode: 'DOWNLOAD' as const, icon: <DownloadIcon fontSize="small" />, label: t('ecommPortal.shipping.downloadLabelFor', { vars }) },
  ];
  return (
    <Box role="presentation" onClick={stop} sx={{ display: 'inline-flex' }}>
      {items.map((item) => (
        <Tooltip key={item.mode} title={ready ? item.label : t('ecommPortal.shipping.labelNeedsAwb')}>
          {/* A disabled button fires no events, so the tooltip hangs off the wrapper. */}
          <span>
            <DuncitIconButton
              size="small"
              aria-label={item.label}
              disabled={!ready}
              data-testid={`order-label-${item.mode.toLowerCase()}`}
              onClick={() => onLabel(row, item.mode)}
            >
              {item.icon}
            </DuncitIconButton>
          </span>
        </Tooltip>
      ))}
    </Box>
  );
}
