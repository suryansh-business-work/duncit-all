import { useState } from 'react';
import { Chip, type ChipProps } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { AiMonitoringDialog } from './AiMonitoringDialog';
import { useAiMonitoringConfig } from './useAiMonitoringConfig';
import { useTranslation } from './useTranslation';

export interface AiMonitoringChipProps {
  size?: ChipProps['size'];
  /** Extra spacing/positioning from the field that hosts it. */
  sx?: ChipProps['sx'];
}

/**
 * The AI Monitoring notice, for mWeb and every portal.
 *
 * Drop it beside any image/file upload control. It is a real `<Chip>` with an
 * `onClick`, so it is a button to the keyboard and to a screen reader without
 * the div-with-role dance, and it renders nothing when an operator has turned
 * the notice off in AI Portal > AI Monitoring > Settings.
 *
 * The native app draws its own Tamagui twin over the same resolved copy —
 * rule 40: share the logic, never the UI.
 */
export function AiMonitoringChip({ size = 'small', sx }: Readonly<AiMonitoringChipProps>) {
  const { visible, copy } = useAiMonitoringConfig();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!visible) return null;

  return (
    <>
      <Chip
        size={size}
        variant="outlined"
        color="primary"
        icon={<SmartToyIcon />}
        label={copy.chipLabel}
        onClick={() => setOpen(true)}
        aria-label={t('aiMonitoring.ariaLabel')}
        sx={sx}
      />
      <AiMonitoringDialog open={open} onClose={() => setOpen(false)} copy={copy} />
    </>
  );
}
