import { AI_MONITOR_MOTION } from '@duncit/utils';
import { useAiMonitorLoop } from './useAiMonitorLoop';

/**
 * The spark catching the light: the icon on any idle AI control.
 *
 * Both native AI controls wear it — the outlined notice chip beside an upload
 * field and the gradient pill on a pod row — and they have to twinkle
 * identically, because a person meeting them on two screens is meant to read
 * them as one feature. The style is built here rather than in each component
 * so there is one set of numbers to change, matching `aiTwinkle` on the web
 * side.
 */
export function useAiTwinkle(active: boolean) {
  const twinkle = useAiMonitorLoop(active, AI_MONITOR_MOTION.twinkleMs);

  return {
    opacity: twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.7, 1] }),
    transform: [
      { scale: twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.16, 1] }) },
      {
        rotate: twinkle.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ['0deg', '16deg', '0deg'],
        }),
      },
    ],
  };
}

/**
 * A band of the AI gradient crossing a control, left to right and back.
 *
 * `outputRange` is in percentages of the band's own width, so a caller sets
 * how wide the band is and this decides where it travels.
 */
export function useAiSweep(active: boolean, from: string, to: string) {
  const sweep = useAiMonitorLoop(active, AI_MONITOR_MOTION.sweepMs);

  return {
    transform: [
      { translateX: sweep.interpolate({ inputRange: [0, 0.5, 1], outputRange: [from, to, from] }) },
    ],
  };
}
