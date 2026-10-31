import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { GARLAND_DEPTH, type OccasionMark } from '@duncit/utils';

import { garlandGroups, type GarlandPiece, type TwinkleGroup } from './garland-groups';
import { twinkleW } from './motion-worklets';
import { vectorPaint } from './scene-parts';

/** The strip a garland is drawn in: deeper than the string itself, since corner webs reach 120px down. */
const STRIP_HEIGHT = GARLAND_DEPTH * 3;

function GarlandMark({ mark }: Readonly<{ mark: GarlandPiece }>) {
  const paint = vectorPaint(mark);
  return (
    <Path
      d={mark.d}
      transform={`translate(${mark.x} ${mark.y}) rotate(${(mark.rotate * 180) / Math.PI})`}
      opacity={mark.alpha}
      fill={paint.fill}
      stroke={paint.stroke}
      strokeWidth={paint.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Steady marks, drawn once. */
function MarkSheet({ marks, width }: Readonly<{ marks: readonly GarlandPiece[]; width: number }>) {
  if (marks.length === 0) return null;
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={STRIP_HEIGHT}>
      {marks.map((mark) => (
        <GarlandMark key={mark.id} mark={mark} />
      ))}
    </Svg>
  );
}

/** Bulbs that share a pulse, glowing together from the clock. */
function TwinkleSheet({
  group,
  width,
  clock,
}: Readonly<{ group: TwinkleGroup; width: number; clock: SharedValue<number> }>) {
  const glow = useAnimatedStyle(() => ({ opacity: twinkleW(group.phase, clock.value) }));
  return (
    <Animated.View testID="occasion-twinkle" style={[StyleSheet.absoluteFill, glow]}>
      <MarkSheet marks={group.marks} width={width} />
    </Animated.View>
  );
}

interface GarlandProps {
  marks: readonly OccasionMark[];
  width: number;
  /** The safe-area top inset: it hangs just under the status bar. */
  top: number;
  clock: SharedValue<number>;
}

/** The garland along the top edge — string lights, bunting, a marigold toran, webs or icicles. */
export const OccasionGarland = memo(function OccasionGarland({
  marks,
  width,
  top,
  clock,
}: Readonly<GarlandProps>) {
  const groups = useMemo(() => garlandGroups(marks), [marks]);
  if (marks.length === 0) return null;
  return (
    <View testID="occasion-garland" style={[styles.strip, { top, width }]}>
      <MarkSheet marks={groups.under} width={width} />
      {groups.twinkles.map((group) => (
        <TwinkleSheet key={`twinkle-${group.phase}`} group={group} width={width} clock={clock} />
      ))}
      <MarkSheet marks={groups.over} width={width} />
    </View>
  );
});

const styles = StyleSheet.create({
  strip: { position: 'absolute', left: 0, height: STRIP_HEIGHT },
});
