import { ButtonBase } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AI_MONITOR_GRADIENT_CSS, AI_MONITOR_MOTION } from '@duncit/utils';
import { aiMotion, aiSweep, aiTwinkle } from './motion';

const { sweepMs, twinkleMs } = AI_MONITOR_MOTION;

export interface AiMonitorPillProps {
  label: string;
  onClick: () => void;
  /** What the pill opens, for a screen reader. Defaults to the label. */
  ariaLabel?: string;
  testId?: string;
}

/**
 * The gradient "AI Monitoring" pill — a real `<button>`, with the colour
 * shimmering under it and the spark turning.
 *
 * There used to be three byte-identical copies of this: the Create Pod step
 * eyebrow on mWeb, the pod row in Admin and the same row in Partners — one of
 * which had re-typed the gradient as a literal, so it could not follow the
 * brand. They are one component now (rule 40), which is also the only way the
 * animation could be added once instead of three times.
 *
 * `background-size: 200%` with an alternating sweep, rather than a looping
 * one-way slide: a one-way loop has to jump back to its first frame, and the
 * jump is visible on a pill this small.
 */
export function AiMonitorPill({
  label,
  onClick,
  ariaLabel,
  testId,
}: Readonly<AiMonitorPillProps>) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      data-testid={testId}
      sx={{
        borderRadius: 999,
        px: 1.25,
        py: 0.5,
        gap: 0.5,
        color: '#fff',
        fontWeight: 700,
        fontSize: 11,
        lineHeight: 1,
        background: AI_MONITOR_GRADIENT_CSS,
        backgroundSize: '200% 100%',
        boxShadow: 1,
        ...aiMotion(`${aiSweep} ${sweepMs}ms ease-in-out infinite alternate`),
      }}
    >
      <AutoAwesomeIcon
        sx={{ fontSize: 14, ...aiMotion(`${aiTwinkle} ${twinkleMs}ms ease-in-out infinite`) }}
      />
      {label}
    </ButtonBase>
  );
}
