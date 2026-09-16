import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
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
 * A band of the AI gradient crossing a control, `from` to `to` and back.
 *
 * `from`/`to` are fractions of the control's width, measured here through the
 * returned `onLayout`: the native driver cannot apply a percentage
 * `translateX`, and a band given one never drew at all.
 */
export function useAiSweep(
  active: boolean,
  from: number,
  to: number,
  durationMs: number = AI_MONITOR_MOTION.sweepMs,
) {
  const [width, setWidth] = useState(0);
  const sweep = useAiMonitorLoop(active, durationMs);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return {
    onLayout,
    sweepStyle: {
      transform: [
        {
          translateX: sweep.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [from * width, to * width, from * width],
          }),
        },
      ],
    },
  };
}
