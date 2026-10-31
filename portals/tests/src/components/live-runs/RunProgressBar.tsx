import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import { alpha, keyframes } from '@mui/material/styles';
import { tokens } from '@duncit/theme';

export type ProgressTone = 'info' | 'warning';

/** The stripes slide one tile to the right, then repeat — a seamless march. */
const march = keyframes`
  from { background-position: 0 0; }
  to { background-position: var(--run-stripe-tile) 0; }
`;
/** The bright head of the bar breathes, so a slow run still looks alive. */
const breathe = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`;

/** One stripe tile, the head's glow and the bar's thickness, in theme spacing units. */
const STRIPE_UNITS = 2;
const HEAD_UNITS = 4;
const THICKNESS = { regular: 1.25, thin: 0.75 } as const;
/** One stripe's march and one breath of the head, in ms. */
const MARCH_MS = tokens.motion.slow * 4;
const BREATHE_MS = tokens.motion.slow * 8;
/** How long the bar takes to reach each new reading — just under the one-second tick, so it never stalls. */
const STEP_MS = tokens.motion.slow * 4;

const { determinate, bar1 } = linearProgressClasses;

const stripes = (ink: string) =>
  `linear-gradient(45deg, ${ink} 25%, transparent 25%, transparent 50%, ${ink} 50%, ${ink} 75%, transparent 75%, transparent)`;

/** The bright head: clear on the left, the highlight at the leading edge. */
const headGlow = (highlight: string) => `linear-gradient(90deg, transparent, ${highlight})`;

interface Props {
  /** 0-100, or null for a bar that moves without a number (queued, stopping, no estimate). */
  value: number | null;
  tone: ProgressTone;
  /** What the bar measures, for a screen reader. */
  label: string;
  /** The reading in words, e.g. "42%, about 12 min left". */
  valueText?: string;
  thickness?: keyof typeof THICKNESS;
}

/**
 * A run's progress: a striped bar in the run's tone whose stripes march and
 * whose head glows, gliding to each new reading. Theme colours and tokens only;
 * with reduced motion asked for, it holds still and jumps between readings.
 */
export default function RunProgressBar({ value, tone, label, valueText, thickness = 'regular' }: Readonly<Props>) {
  return (
    <LinearProgress
      variant={value === null ? 'indeterminate' : 'determinate'}
      value={value ?? undefined}
      color={tone}
      aria-label={label}
      aria-valuetext={valueText}
      sx={(theme) => {
        const main = theme.palette[tone].main;
        const ink = alpha(theme.palette.common.white, tokens.state.ring);
        return {
          '--run-stripe-tile': theme.spacing(STRIPE_UNITS),
          height: theme.spacing(THICKNESS[thickness]),
          borderRadius: `${tokens.radius.lg}px`,
          bgcolor: alpha(main, tokens.state.tint[theme.palette.mode]),
          [`& .${bar1}`]: {
            borderRadius: 'inherit',
            backgroundColor: main,
            backgroundImage: stripes(ink),
            backgroundSize: 'var(--run-stripe-tile) var(--run-stripe-tile)',
          },
          [`&.${determinate}`]: {
            [`& .${bar1}`]: {
              animation: `${march} ${MARCH_MS}ms linear infinite`,
              transition: theme.transitions.create('transform', { duration: STEP_MS, easing: tokens.motion.ease }),
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: theme.spacing(HEAD_UNITS),
                borderRadius: 'inherit',
                background: headGlow(alpha(theme.palette.common.white, tokens.state.tintBorder.dark)),
                animation: `${breathe} ${BREATHE_MS}ms ${tokens.motion.ease} infinite`,
              },
            },
            '@media (prefers-reduced-motion: reduce)': {
              [`& .${bar1}`]: { animation: 'none', transition: 'none', '&::after': { animation: 'none' } },
            },
          },
        };
      }}
    />
  );
}
