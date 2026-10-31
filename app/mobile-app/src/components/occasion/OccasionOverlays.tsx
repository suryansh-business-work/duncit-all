import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colorWithAlpha, type LinearOp, type OccasionScene, type RadialOp } from '@duncit/utils';

import { fogCentreX, type Box } from './motion-worklets';
import { overlayParts, type OverlayPart } from './scene-parts';

interface GlowProps {
  id: string;
  op: RadialOp;
  cx: number;
  cy: number;
}

/** A soft round glow centred on (cx, cy): the look's colour from its inner stop, fading to the edge. */
function Glow({ id, op, cx, cy }: Readonly<GlowProps>) {
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx={cx} cy={cy} r={op.radius} gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor={op.color} stopOpacity={op.inner_alpha} />
          <Stop offset={op.inner_stop} stopColor={op.color} stopOpacity={op.inner_alpha} />
          <Stop offset={1} stopColor={op.color} stopOpacity={op.outer_alpha} />
        </RadialGradient>
      </Defs>
      <Rect
        x={cx - op.radius}
        y={cy - op.radius}
        width={op.radius * 2}
        height={op.radius * 2}
        fill={`url(#${id})`}
      />
    </>
  );
}

/** A fog bank the clock carries slowly sideways along the bottom of the screen. */
function FogBank({
  part,
  op,
  box,
  clock,
}: Readonly<{ part: OverlayPart; op: RadialOp; box: Box; clock: SharedValue<number> }>) {
  const size = op.radius * 2;
  const drift = useAnimatedStyle(() => ({
    transform: [
      { translateX: fogCentreX(part.bank, clock.value, box.width, op.radius) - op.radius },
    ],
  }));
  return (
    <Animated.View
      testID="occasion-fog"
      style={[styles.fill, { top: op.y - op.radius, width: size, height: size }, drift]}
    >
      <Svg width={size} height={size}>
        <Glow id={part.id} op={op} cx={op.radius} cy={op.radius} />
      </Svg>
    </Animated.View>
  );
}

/** A colour fading down from the top of the screen. */
function TopGlow({ op, width }: Readonly<{ op: LinearOp; width: number }>) {
  return (
    <LinearGradient
      testID="occasion-band"
      colors={[colorWithAlpha(op.color, op.top_alpha), colorWithAlpha(op.color, op.bottom_alpha)]}
      style={[styles.fill, { top: op.y0, width, height: op.y1 - op.y0 }]}
    />
  );
}

function OverlayPiece({
  part,
  box,
  clock,
}: Readonly<{ part: OverlayPart; box: Box; clock: SharedValue<number> }>) {
  const { op } = part;
  if (op.op === 'linear') return <TopGlow op={op} width={box.width} />;
  if (part.drifts) return <FogBank part={part} op={op} box={box} clock={clock} />;
  return (
    <Svg testID="occasion-glow" style={styles.fill} width={box.width} height={box.height}>
      <Glow id={part.id} op={op} cx={op.x} cy={op.y} />
    </Svg>
  );
}

/** The look's atmosphere, under everything else it draws: a vignette, a glow from the top, drifting fog. */
export const OccasionOverlays = memo(function OccasionOverlays({
  scene,
  box,
  clock,
}: Readonly<{ scene: OccasionScene; box: Box; clock: SharedValue<number> }>) {
  const parts = useMemo(() => overlayParts(scene), [scene]);
  return (
    <>
      {parts.map((part) => (
        <OverlayPiece key={part.id} part={part} box={box} clock={clock} />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0 },
});
