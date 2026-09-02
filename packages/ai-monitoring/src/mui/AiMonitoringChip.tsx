import { useState } from 'react';
import { Chip, type ChipProps } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { AI_MONITOR_GRADIENT_CSS, AI_MONITOR_MOTION } from '@duncit/utils';
import { AiMonitoringDialog } from './AiMonitoringDialog';
import { aiMotion, aiSheen, aiTwinkle } from './motion';
import { useAiMonitoringConfig } from './useAiMonitoringConfig';
import { useTranslation } from './useTranslation';

const { sweepMs, twinkleMs } = AI_MONITOR_MOTION;

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
 * It moves, because it is a disclosure sitting beside a field a person is busy
 * filling in: a band of the AI gradient crosses it and the bot's eye turns, so
 * it is noticed before the upload rather than after. Both stop dead for
 * `prefers-reduced-motion` (see `aiMotion`), and neither touches the chip's
 * outline, colour or label — this is still the same quiet chip.
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
        icon={
          <SmartToyIcon
            sx={aiMotion(`${aiTwinkle} ${twinkleMs}ms ease-in-out infinite`)}
          />
        }
        label={copy.chipLabel}
        onClick={() => setOpen(true)}
        aria-label={t('aiMonitoring.ariaLabel')}
        sx={[
          {
            position: 'relative',
            overflow: 'hidden',
            // The sheen, as a pseudo-element, so it can cross the chip without
            // a wrapper element that would break Chip's own icon/label layout.
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              width: '45%',
              borderRadius: 'inherit',
              pointerEvents: 'none',
              opacity: 0.28,
              background: AI_MONITOR_GRADIENT_CSS,
              ...aiMotion(`${aiSheen} ${sweepMs}ms ease-in-out infinite`),
            },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      />
      <AiMonitoringDialog open={open} onClose={() => setOpen(false)} copy={copy} />
    </>
  );
}
