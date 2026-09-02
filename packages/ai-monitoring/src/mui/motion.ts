import { keyframes } from '@mui/material';
import { AI_MONITOR_MOTION } from '@duncit/utils';

/**
 * The AI Monitoring motion language, in CSS.
 *
 * Five gestures, and every surface that says "AI" uses one of them: an idle
 * control shimmers, a badge breathes, a running check emits rings and drives a
 * scan bar, and the spark twinkles on top of whichever of those is showing. The
 * timings are not written here — they come from `AI_MONITOR_MOTION`, which the
 * native app reads too, so the two hand-written animations stay the same
 * animation (rule 40).
 */
const { breatheScale, ringFrom, ringTo, ringOpacity } = AI_MONITOR_MOTION;

/** Colour sliding under an idle chip or pill: alive, going nowhere. */
export const aiSweep = keyframes`
  from { background-position: 0% 50%; }
  to   { background-position: 100% 50%; }
`;

/** A band of light crossing a flat control — the shimmer, for surfaces with no
 * gradient of their own to slide. */
export const aiSheen = keyframes`
  from { transform: translateX(-140%); }
  to   { transform: translateX(240%); }
`;

/** The badge, breathing, so a wait never looks frozen. */
export const aiBreathe = keyframes`
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(${breatheScale}); }
`;

/** Rings leaving the badge — the check is still reading. */
export const aiRipple = keyframes`
  from { transform: scale(${ringFrom}); opacity: ${ringOpacity}; }
  to   { transform: scale(${ringTo}); opacity: 0; }
`;

/** The scan line crossing its track. */
export const aiScan = keyframes`
  from { transform: translateX(-70%); }
  to   { transform: translateX(270%); }
`;

/** The spark catching the light. */
export const aiTwinkle = keyframes`
  0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
  50%      { opacity: 0.7; transform: scale(1.16) rotate(16deg); }
`;

/** An `sx` fragment carrying one animation, and the stillness a reader who
 * asked their system for less motion gets instead. */
interface AiMotionSx {
  animation: string;
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' };
}

/**
 * One animation, silenced for `prefers-reduced-motion`.
 *
 * Spread it into any `sx`. Every animation in this package goes through it
 * rather than setting `animation` directly: the notice is shown to people who
 * are about to upload something, and a shimmer nobody can switch off is a
 * reason to look away from exactly the sentence they need to read.
 */
export function aiMotion(animation: string): AiMotionSx {
  return {
    animation,
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  };
}

/** A line of text breathing, for a label that says a check is running. Opacity
 * only — the spark may turn, but text that rotated would be unreadable. */
export const aiPulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
`;
