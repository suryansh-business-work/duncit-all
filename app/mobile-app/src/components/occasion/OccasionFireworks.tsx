import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { OccasionFireworks as Fireworks } from '@duncit/utils';

import { BURST_MARGIN, burstPaint, burstSlotCount } from './firework-worklets';
import type { Box } from './motion-worklets';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SlotProps {
  slot: number;
  slots: number;
  fireworks: Fireworks;
  box: Box;
  clock: SharedValue<number>;
}

/**
 * One burst at a time, in a box centred on wherever it goes off: streaks,
 * halos and cores as three paths the UI thread redraws from the clock. An
 * idle slot draws empty paths.
 */
function BurstSlot({ slot, slots, fireworks, box, clock }: Readonly<SlotProps>) {
  const half = fireworks.radius + BURST_MARGIN;
  const paint = useDerivedValue(() => burstPaint(fireworks, slot, slots, clock.value, box, half));
  const place = useAnimatedStyle(() => ({
    transform: [{ translateX: paint.value.x - half }, { translateY: paint.value.y - half }],
  }));
  const streaks = useAnimatedProps(() => ({
    d: paint.value.streaks,
    stroke: paint.value.color,
    strokeWidth: paint.value.r * 1.1,
    strokeOpacity: paint.value.alpha * 0.55,
  }));
  const halos = useAnimatedProps(() => ({
    d: paint.value.halos,
    fill: paint.value.color,
    fillOpacity: paint.value.alpha * 0.25,
  }));
  const cores = useAnimatedProps(() => ({
    d: paint.value.cores,
    fill: paint.value.color,
    fillOpacity: paint.value.alpha,
  }));
  return (
    <Animated.View
      testID="occasion-burst"
      style={[styles.slot, { width: half * 2, height: half * 2 }, place]}
    >
      <Svg width={half * 2} height={half * 2}>
        <AnimatedPath animatedProps={streaks} fill="none" strokeLinecap="round" />
        <AnimatedPath animatedProps={halos} />
        <AnimatedPath animatedProps={cores} />
      </Svg>
    </Animated.View>
  );
}

/** Bursts of glowing, streaking sparks in the upper half of the screen; nothing when the look has none. */
export const OccasionFireworks = memo(function OccasionFireworks({
  fireworks,
  box,
  clock,
}: Readonly<{ fireworks: Fireworks; box: Box; clock: SharedValue<number> }>) {
  const slots = burstSlotCount(fireworks);
  const ids = useMemo(() => Array.from({ length: slots }, (_, slot) => slot), [slots]);
  return (
    <>
      {ids.map((slot) => (
        <BurstSlot
          key={`burst-${slot}`}
          slot={slot}
          slots={slots}
          fireworks={fireworks}
          box={box}
          clock={clock}
        />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, top: 0 },
});
