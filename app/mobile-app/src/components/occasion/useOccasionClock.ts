import { useEffect } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { clockStep } from './motion-worklets';

/**
 * The decoration's clock, in seconds, ticking on the UI thread — every mark,
 * flyer and spark reads its pose from it, so nothing re-renders in React per
 * frame. Stopped, it holds its time: a paused look stays where it was.
 */
export function useOccasionClock(running: boolean): SharedValue<number> {
  const clock = useSharedValue(0);
  const frame = useFrameCallback((info) => {
    'worklet';
    clock.value += clockStep(info.timeSincePreviousFrame);
  }, false);
  useEffect(() => {
    frame.setActive(running);
  }, [frame, running]);
  return clock;
}
